package com.boruikang.health.plan.service;
import com.boruikang.health.audit.service.AuditService;
import com.boruikang.health.auth.service.CurrentAccount;
import com.boruikang.health.common.*;
import com.boruikang.health.mapper.*;
import com.boruikang.health.model.*;
import com.boruikang.health.patient.service.PatientAccess;
import com.boruikang.health.patient.service.PatientService;
import com.boruikang.health.plan.dto.*;
import com.github.pagehelper.PageHelper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
/** Signed service instances. Activation expands the package plan into dated tasks tagged with enrollment id and node sequence. */
@Service
public class EnrollmentService {
    private static final Logger log=LoggerFactory.getLogger(EnrollmentService.class);
    private final ServiceEnrollmentMapper enrollments;private final ServicePackageMapper packages;private final CareTaskMapper tasks;private final PatientMapper patients;
    private final PatientAccess access;private final AuditService audit;private final PatientService patientService;private final PackageService packageService;private final PlanService planService;
    public EnrollmentService(ServiceEnrollmentMapper enrollments,ServicePackageMapper packages,CareTaskMapper tasks,PatientMapper patients,PatientAccess access,AuditService audit,PatientService patientService,PackageService packageService,PlanService planService){
        this.enrollments=enrollments;this.packages=packages;this.tasks=tasks;this.patients=patients;this.access=access;this.audit=audit;this.patientService=patientService;this.packageService=packageService;this.planService=planService;}
    public Paged<EnrollmentResponse> query(EnrollmentQueryRequest req){
        log.info("query enrollments status={} patientId={}",req.status(),req.patientId());access.staff();var actor=CurrentAccount.get();
        ServiceEnrollmentExample ex=new ServiceEnrollmentExample();ex.eq("hospital_id",actor.hospitalId());
        if(req.patientId()!=null){access.require(req.patientId());ex.eq("patient_id",req.patientId());}
        else {access.operations();if(access.executor())ex.in("patient_id",access.scopedPatientIds(2000));}
        if(req.packageId()!=null)ex.eq("package_id",req.packageId());if(Checks.text(req.status()))ex.eq("status",req.status());
        if(req.endFrom()!=null)ex.ge("end_date",req.endFrom());if(req.endTo()!=null)ex.le("end_date",req.endTo());
        if(Boolean.TRUE.equals(req.expiringSoon()))ex.eq("status","ACTIVE").le("end_date",LocalDate.now().plusDays(14));
        ex.setOrderByClause("status ASC,end_date ASC,id DESC");PageHelper.startPage(Paged.number(req.page()),Paged.size(req.size()));
        List<ServiceEnrollment> rows=enrollments.selectByExample(ex);Map<Long,Patient> names=names(rows.stream().map(r->r.patientId).distinct().toList());
        return Paged.of(rows,r->view(r,names.get(r.patientId)));
    }
    @Transactional
    public EnrollmentResponse create(CreateEnrollmentRequest req){
        log.info("create enrollment patientId={} packageId={}",req.patientId(),req.packageId());access.operations();Patient p=access.lock(req.patientId());
        ServiceEnrollment existing=byKey(p.hospitalId,req.requestKey());if(existing!=null){Checks.conflict(p.id.equals(existing.patientId));return view(existing,p);}
        Checks.require(!List.of("CLOSED","TRANSFERRED").contains(p.lifecycle),"Patient is closed or transferred / 患者已结案或转出");
        ServicePackage k=packageService.requireActive(req.packageId());
        ServiceEnrollmentExample open=new ServiceEnrollmentExample();open.eq("hospital_id",p.hospitalId).eq("patient_id",p.id).in("status",List.of("PENDING_ACTIVATION","ACTIVE"));
        Checks.require(enrollments.countByExample(open)==0,"Patient already has an open enrollment; close or upgrade it first / 患者已有进行中的服务实例，请先结案或升级");
        ServiceEnrollment e=new ServiceEnrollment();e.hospitalId=p.hospitalId;e.patientId=p.id;e.packageId=k.id;e.orderNo=req.orderNo();e.signedAt=req.signedAt();e.status="PENDING_ACTIVATION";e.consentAt=req.consentAt();e.consentEvidence=req.consentEvidence().trim();e.summary=req.summary();e.requestKey=req.requestKey();e.version=0;e.creator=CurrentAccount.get().userId().toString();
        enrollments.insertSelective(e);audit.append(p.id,"ENROLLMENT_SIGNED",e.id,null,"PENDING_ACTIVATION",k.code+(Checks.text(req.orderNo())?"; order="+req.orderNo():""));
        Patient patch=new Patient();patch.servicePackageId=k.id;patch.version=p.version+1;patch.modifier=e.creator;PatientExample px=new PatientExample();px.eq("id",p.id).eq("version",p.version);Checks.conflict(patients.updateByExampleSelective(patch,px)==1);p.version=patch.version;
        if(Boolean.TRUE.equals(req.activateNow()))activate(p,enrollments.selectByPrimaryKey(e.id),k,LocalDate.now());
        return view(enrollments.selectByPrimaryKey(e.id),p);
    }
    @Transactional
    public EnrollmentResponse transition(TransitionEnrollmentRequest req){
        log.info("transition enrollment id={} action={}",req.id(),req.action());access.operations();ServiceEnrollment e=enrollments.selectByPrimaryKey(req.id());
        Checks.found(e!=null&&CurrentAccount.get().hospitalId().equals(e.hospitalId));Patient p=access.lock(e.patientId);Checks.conflict(req.version().equals(e.version));
        ServicePackage k=packages.selectByPrimaryKey(e.packageId);
        switch(req.action()){
            case "ACTIVATE"->{Checks.conflict("PENDING_ACTIVATION".equals(e.status));activate(p,e,k,req.startDate()==null?LocalDate.now():req.startDate());}
            case "CLOSE"->{Checks.conflict(List.of("PENDING_ACTIVATION","ACTIVE").contains(e.status));Checks.require(Checks.text(req.reason()),"Close reason required / 请填写结案原因");
                ServiceEnrollment patch=new ServiceEnrollment();patch.status="CLOSED";patch.closedAt=LocalDateTime.now();patch.closeReason=req.reason().trim();save(e,patch,"ENROLLMENT_CLOSED");cancelOpenTasks(p,e,"服务实例结案："+req.reason());}
            case "EXPIRE"->{Checks.conflict("ACTIVE".equals(e.status));Checks.require(e.endDate!=null&&!e.endDate.isAfter(LocalDate.now()),"Service period has not ended / 服务期未结束");
                ServiceEnrollment patch=new ServiceEnrollment();patch.status="EXPIRED";patch.closedAt=LocalDateTime.now();patch.closeReason="服务期满";save(e,patch,"ENROLLMENT_EXPIRED");patientService.advance(p,"REVISIT_DUE","Enrollment "+e.id+" expired");}
            case "UPGRADE"->{Checks.conflict("ACTIVE".equals(e.status));Checks.require(req.upgradePackageId()!=null&&!req.upgradePackageId().equals(e.packageId),"Choose a different package to upgrade to / 请选择升级后的服务包");
                ServicePackage next=packageService.requireActive(req.upgradePackageId());
                ServiceEnrollment n=new ServiceEnrollment();n.hospitalId=p.hospitalId;n.patientId=p.id;n.packageId=next.id;n.orderNo=req.upgradeOrderNo();n.signedAt=LocalDateTime.now();n.status="PENDING_ACTIVATION";n.consentAt=e.consentAt;n.consentEvidence=e.consentEvidence;n.summary="由服务实例 "+e.id+" 升级";n.requestKey="upgrade-"+e.id+"-"+next.id;n.version=0;n.creator=CurrentAccount.get().userId().toString();
                if(byKey(p.hospitalId,n.requestKey)==null)enrollments.insertSelective(n);else n=byKey(p.hospitalId,n.requestKey);
                ServiceEnrollment patch=new ServiceEnrollment();patch.status="UPGRADED";patch.closedAt=LocalDateTime.now();patch.closeReason="升级到 "+next.code;patch.upgradeToId=n.id;save(e,patch,"ENROLLMENT_UPGRADED");cancelOpenTasks(p,e,"服务包升级，旧实例任务作废");
                Patient pp=new Patient();pp.servicePackageId=next.id;pp.version=p.version+1;pp.modifier=n.creator;PatientExample px=new PatientExample();px.eq("id",p.id).eq("version",p.version);Checks.conflict(patients.updateByExampleSelective(pp,px)==1);p.version=pp.version;
                activate(p,enrollments.selectByPrimaryKey(n.id),next,LocalDate.now());return view(enrollments.selectByPrimaryKey(n.id),p);}
            default->throw new IllegalArgumentException("Unknown action");
        }
        return view(enrollments.selectByPrimaryKey(e.id),p);
    }
    private void activate(Patient p,ServiceEnrollment e,ServicePackage k,LocalDate start){
        Checks.require(k!=null&&k.planId!=null,"Package has no follow-up plan / 服务包未关联随访方案");FollowupPlan plan=planService.requireActive(k.planId);
        ServiceEnrollment patch=new ServiceEnrollment();patch.status="ACTIVE";patch.activatedAt=LocalDateTime.now();patch.activatedBy=CurrentAccount.get().userId();patch.startDate=start;patch.endDate=start.plusDays(k.periodDays);
        save(e,patch,"ENROLLMENT_ACTIVATED");int created=0;
        for(FollowupPlanNode node:planService.nodesOf(plan.id)){
            String key="enrollment-"+e.id+"-"+node.seq;CareTaskExample dup=new CareTaskExample();dup.eq("hospital_id",p.hospitalId).eq("request_key",key);if(tasks.countByExample(dup)>0)continue;
            CareTask t=new CareTask();t.hospitalId=p.hospitalId;t.patientId=p.id;t.taskType=node.taskType;t.title=node.title;t.priority=node.priority;t.status="PENDING";t.assigneeId=p.ownerId;t.doctorId=p.doctorId;
            t.dueAt=start.plusDays(node.offsetDays).atTime(9,0);t.followupStage=node.stage;t.enrollmentId=e.id;t.planNodeSeq=node.seq;t.draftText=node.checklist;t.draftOrigin=Checks.text(node.checklist)?"TEMPLATE":null;t.requestKey=key;t.version=0;t.creator=CurrentAccount.get().userId().toString();
            tasks.insertSelective(t);created++;
        }
        audit.append(p.id,"PLAN_TASKS_GENERATED",e.id,null,"ACTIVE","plan="+plan.name+"; tasks="+created+"; period="+start+" to "+patch.endDate);
        patientService.advance(p,"MANAGING","Enrollment "+e.id+" activated");
    }
    private void cancelOpenTasks(Patient p,ServiceEnrollment e,String reason){
        CareTaskExample ex=new CareTaskExample();ex.eq("hospital_id",p.hospitalId).eq("enrollment_id",e.id).in("status",List.of("PENDING","IN_PROGRESS","REJECTED"));PageHelper.startPage(1,200,false);
        for(CareTask t:tasks.selectByExample(ex)){CareTask patch=new CareTask();patch.status="CANCELLED";patch.outcome=reason;patch.version=t.version+1;patch.modifier=CurrentAccount.get().userId().toString();CareTaskExample tx=new CareTaskExample();tx.eq("id",t.id).eq("version",t.version);
            if(tasks.updateByExampleSelective(patch,tx)==1)audit.append(p.id,"TASK_CANCEL",t.id,t.status,"CANCELLED",reason);}
    }
    private void save(ServiceEnrollment before,ServiceEnrollment patch,String action){
        patch.version=before.version+1;patch.modifier=CurrentAccount.get().userId().toString();ServiceEnrollmentExample ex=new ServiceEnrollmentExample();ex.eq("id",before.id).eq("hospital_id",before.hospitalId).eq("version",before.version);
        Checks.conflict(enrollments.updateByExampleSelective(patch,ex)==1);before.version=patch.version;before.status=patch.status==null?before.status:patch.status;audit.append(before.patientId,action,before.id,null,before.status,"version="+patch.version);
    }
    private ServiceEnrollment byKey(Long hospitalId,String key){ServiceEnrollmentExample ex=new ServiceEnrollmentExample();ex.eq("hospital_id",hospitalId).eq("request_key",key);PageHelper.startPage(1,1,false);List<ServiceEnrollment> rows=enrollments.selectByExample(ex);return rows.isEmpty()?null:rows.getFirst();}
    private Map<Long,Patient> names(List<Long> ids){if(ids.isEmpty())return Map.of();PatientExample ex=new PatientExample();ex.eq("hospital_id",CurrentAccount.get().hospitalId()).in("id",ids);ex.selectColumns("id","name");PageHelper.startPage(1,100,false);return patients.selectByExample(ex).stream().collect(Collectors.toMap(r->r.id,Function.identity()));}
    EnrollmentResponse view(ServiceEnrollment e,Patient p){
        ServicePackage k=packages.selectByPrimaryKey(e.packageId);
        CareTaskExample all=new CareTaskExample();all.eq("hospital_id",e.hospitalId).eq("enrollment_id",e.id).ne("status","CANCELLED");CareTaskExample done=new CareTaskExample();done.eq("hospital_id",e.hospitalId).eq("enrollment_id",e.id).eq("status","COMPLETED");
        Integer remaining=e.endDate==null||!"ACTIVE".equals(e.status)?null:(int)ChronoUnit.DAYS.between(LocalDate.now(),e.endDate);
        return new EnrollmentResponse(e.id,e.patientId,p==null?"":PatientService.maskName(p.name),e.packageId,k==null?null:k.name,k==null?null:k.tier,e.orderNo,e.signedAt,e.startDate,e.endDate,e.status,e.activatedAt,e.activatedBy,e.consentAt,e.consentEvidence,e.summary,e.closedAt,e.closeReason,e.upgradeToId,e.version,tasks.countByExample(all),tasks.countByExample(done),remaining);
    }
}
