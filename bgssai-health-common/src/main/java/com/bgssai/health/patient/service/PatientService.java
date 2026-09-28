package com.bgssai.health.patient.service;

import com.bgssai.health.audit.service.AuditService;
import com.bgssai.health.auth.dto.AccountInfo;
import com.bgssai.health.auth.service.CurrentAccount;
import com.bgssai.health.common.*;
import com.bgssai.health.mapper.*;
import com.bgssai.health.model.*;
import com.bgssai.health.patient.dto.*;
import com.github.pagehelper.PageHelper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

@Service
public class PatientService {
    private static final Logger log=LoggerFactory.getLogger(PatientService.class);
    private final PatientMapper patients; private final HealthAccountMapper accounts; private final CareTaskMapper tasks;
    private final IntakeChannelMapper channels; private final KnowledgeEntryMapper knowledge; private final PatientAccess access; private final AuditService audit;
    public PatientService(PatientMapper patients,HealthAccountMapper accounts,CareTaskMapper tasks,IntakeChannelMapper channels,
        KnowledgeEntryMapper knowledge,PatientAccess access,AuditService audit) {
        this.patients=patients;this.accounts=accounts;this.tasks=tasks;this.channels=channels;this.knowledge=knowledge;this.access=access;this.audit=audit;
    }
    public Paged<PatientResponse> query(PatientQueryRequest req) {
        log.info("query patients page={}",req.page());PatientExample ex=access.scope();
        if (Checks.text(req.keyword())) ex.like("name","%"+req.keyword().trim()+"%");
        if (Checks.text(req.riskLevel())) ex.eq("risk_level",req.riskLevel());
        if (Checks.text(req.department())) ex.eq("department",req.department());
        PageHelper.startPage(Paged.number(req.page()),Paged.size(req.size()));
        List<Patient> rows=patients.selectByExample(ex);
        return Paged.of(rows,r->view(r,true));
    }
    public PatientResponse detail(Long id) { log.info("patient detail patientId={}",id);access.staff();return view(access.require(id),false); }
    public PatientResponse profile() { log.info("patient profile accountId={}",CurrentAccount.get().userId());Patient p=access.own(false);return p==null?null:view(p,false); }
    @Transactional
    public PatientResponse create(CreatePatientRequest req) {
        log.info("create patient actorId={}",CurrentAccount.get().userId());access.staff();var actor=CurrentAccount.get();
        Long doctorId=req.doctorId(), ownerId=req.ownerId();
        if ("DOCTOR".equals(actor.roleCode())) { Checks.permit(doctorId==null||actor.userId().equals(doctorId));doctorId=actor.userId(); }
        if (List.of("NURSE","OPERATOR").contains(actor.roleCode())) { Checks.permit(ownerId==null||actor.userId().equals(ownerId));ownerId=actor.userId(); }
        validateStaff(doctorId,"DOCTOR"); validateStaff(ownerId,"NURSE","OPERATOR","MANAGER");
        Patient p=new Patient();p.hospitalId=actor.hospitalId();p.name=req.name().trim();p.gender=req.gender();p.age=req.age();p.phone=req.phone();
        p.department=req.department();p.disease=req.disease();p.doctorId=doctorId;p.ownerId=ownerId;p.note=req.note();p.creator=actor.userId().toString();
        p.riskLevel="UNKNOWN";p.lifecycle="ENROLLED";p.version=0;patients.insertSelective(p);
        audit.append(p.id,"PATIENT_CREATED",p.id,null,"ENROLLED","Manual enrollment");return view(patients.selectByPrimaryKey(p.id),false);
    }
    @Transactional
    public PatientResponse update(UpdatePatientRequest req) {
        log.info("update patient patientId={}",req.id());access.staff();Patient p=access.lock(req.id());Checks.conflict(req.version().equals(p.version));
        if ((req.doctorId()!=null&&!Objects.equals(req.doctorId(),p.doctorId))||(req.ownerId()!=null&&!Objects.equals(req.ownerId(),p.ownerId))) access.manager();
        if (req.riskLevel()!=null&&!req.riskLevel().equals(p.riskLevel)) access.doctor(p);
        validateStaff(req.doctorId(),"DOCTOR"); validateStaff(req.ownerId(),"NURSE","OPERATOR","MANAGER");
        if (req.servicePackageId()!=null) {
            KnowledgeEntry k=knowledge.selectByPrimaryKey(req.servicePackageId());
            Checks.require(k!=null&&p.hospitalId.equals(k.hospitalId)&&"PACKAGE".equals(k.kind)&&"PUBLISHED".equals(k.status),"Published service package required");
        }
        Patient patch=new Patient();patch.doctorId=req.doctorId();patch.ownerId=req.ownerId();patch.lifecycle=req.lifecycle();patch.riskLevel=req.riskLevel();
        patch.note=req.note();patch.servicePackageId=req.servicePackageId();patch.version=p.version+1;patch.modifier=CurrentAccount.get().userId().toString();
        PatientExample ex=new PatientExample();ex.eq("id",p.id).eq("hospital_id",p.hospitalId).eq("version",p.version);
        Checks.conflict(patients.updateByExampleSelective(patch,ex)==1);
        boolean doctorChanged=patch.doctorId!=null&&!Objects.equals(patch.doctorId,p.doctorId);
        boolean ownerChanged=patch.ownerId!=null&&!Objects.equals(patch.ownerId,p.ownerId);
        if (doctorChanged||ownerChanged) {
            long cursor=0;
            while(true) {
                CareTaskExample tx=new CareTaskExample();tx.eq("hospital_id",p.hospitalId).eq("patient_id",p.id).ge("id",cursor+1);
                tx.setOrderByClause("id ASC");
                PageHelper.startPage(1,100,false);
                List<CareTask> batch=tasks.selectByExample(tx);
                if(batch.isEmpty())break;
                for(CareTask task:batch) {
                    CareTask taskPatch=new CareTask();taskPatch.doctorId=patch.doctorId;taskPatch.assigneeId=patch.ownerId;
                    taskPatch.version=task.version+1;taskPatch.modifier=CurrentAccount.get().userId().toString();
                    if(doctorChanged&&List.of("PENDING_REVIEW","APPROVED").contains(task.status)) {
                        taskPatch.status="IN_PROGRESS";taskPatch.approvedText="";taskPatch.reviewNote="责任医生变更，请重新提交审核";
                    }
                    CareTaskExample condition=new CareTaskExample();condition.eq("id",task.id).eq("hospital_id",p.hospitalId).eq("version",task.version);
                    Checks.conflict(tasks.updateByExampleSelective(taskPatch,condition)==1);
                    audit.append(p.id,"TASK_REASSIGNED",task.id,task.status,taskPatch.status==null?task.status:taskPatch.status,"version="+taskPatch.version);
                    cursor=task.id;
                }
            }
        }
        audit.append(p.id,"PATIENT_UPDATED",p.id,p.lifecycle,req.lifecycle(),"Profile, assignment or risk updated");
        return view(patients.selectByPrimaryKey(p.id),false);
    }
    @Transactional
    public PatientResponse enroll(EnrollRequest req) {
        log.info("enroll patient accountId={}",CurrentAccount.get().userId());Checks.require(Boolean.TRUE.equals(req.consent()),"Consent required");
        Patient existing=access.own(false);if(existing!=null)return view(existing,false);
        var actor=CurrentAccount.get(); IntakeChannel channel=null;
        if (Checks.text(req.token())) {
            IntakeChannelExample ex=new IntakeChannelExample();ex.eq("token",req.token()).eq("is_active",true).eq("hospital_id",actor.hospitalId());
            PageHelper.startPage(1,1,false);
            List<IntakeChannel> rows=channels.selectByExample(ex);Checks.found(!rows.isEmpty());channel=rows.getFirst();
        }
        Patient p=new Patient();p.accountId=actor.userId();p.hospitalId=actor.hospitalId();p.name=req.name().trim();p.gender=req.gender();p.age=req.age();p.phone=req.phone();
        p.department=channel==null?"综合服务":channel.department;p.disease="待医师确认";p.riskLevel="UNKNOWN";p.lifecycle="ENROLLED";p.version=0;
        p.consentAt=LocalDateTime.now();p.creator=actor.userId().toString();
        if(channel!=null) { p.channelId=channel.id;p.doctorId=channel.doctorId;p.ownerId=channel.ownerId; }
        patients.insertSelective(p);
        CareTask task=new CareTask();task.hospitalId=p.hospitalId;task.patientId=p.id;task.taskType="FOLLOWUP";task.title="新入组首次联系";
        task.priority="P2";task.status="PENDING";task.assigneeId=p.ownerId;task.doctorId=p.doctorId;task.dueAt=LocalDateTime.now().plusDays(1);
        task.requestKey="enroll-"+p.id;task.version=0;task.creator=p.creator;tasks.insertSelective(task);
        audit.append(p.id,"PATIENT_ENROLLED",p.id,null,"ENROLLED","Consent HEALTH-MVP-1; channel="+(channel==null?"DIRECT":channel.id));
        return view(patients.selectByPrimaryKey(p.id),false);
    }
    public List<AccountInfo> staff() {
        log.info("list staff hospitalId={}",CurrentAccount.get().hospitalId());access.staff();
        HealthAccountExample ex=new HealthAccountExample();ex.eq("hospital_id",CurrentAccount.get().hospitalId()).eq("is_enabled",true)
            .in("role_code",List.of("DOCTOR","MANAGER","NURSE","OPERATOR"));ex.selectColumns("id","real_name","role_code","hospital_id");
        PageHelper.startPage(1,100,false);
        List<HealthAccount> rows=accounts.selectByExample(ex);
        return rows.stream().map(r->new AccountInfo(r.id,r.realName,r.roleCode,r.hospitalId)).toList();
    }
    public void validateStaff(Long id,String... roles) {
        if(id==null)return;HealthAccount a=accounts.selectByPrimaryKey(id);
        Checks.require(a!=null&&CurrentAccount.get().hospitalId().equals(a.hospitalId)&&Boolean.TRUE.equals(a.enabled)&&List.of(roles).contains(a.roleCode),"Invalid staff assignment / 请选择本院有效医护人员");
    }
    public static PatientResponse view(Patient p,boolean masked) {
        String name=masked&&p.name.length()>1?p.name.substring(0,1)+"*".repeat(p.name.length()-1):p.name;
        String phone=masked&&p.phone.length()>7?p.phone.substring(0,3)+"****"+p.phone.substring(p.phone.length()-4):p.phone;
        return new PatientResponse(p.id,name,p.gender,p.age,phone,p.department,p.disease,p.riskLevel,p.lifecycle,p.doctorId,p.ownerId,p.channelId,p.servicePackageId,p.consentAt,masked||"USER".equals(CurrentAccount.get().roleCode())?null:p.note,p.version,p.gmtCreate);
    }
}
