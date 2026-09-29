package com.bgssai.health.referral.service;
import com.bgssai.health.audit.service.AuditService;
import com.bgssai.health.auth.service.CurrentAccount;
import com.bgssai.health.common.*;
import com.bgssai.health.mapper.*;
import com.bgssai.health.model.*;
import com.bgssai.health.org.service.OrgService;
import com.bgssai.health.org.service.SlaResolver;
import com.bgssai.health.patient.service.PatientAccess;
import com.bgssai.health.patient.service.PatientService;
import com.bgssai.health.referral.dto.*;
import com.github.pagehelper.PageHelper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
/** Two-way referral ledger between the hospital and its network organisations, with feedback closure. */
@Service
public class ReferralService {
    private static final Logger log=LoggerFactory.getLogger(ReferralService.class);
    private static final List<String> OPEN=List.of("INITIATED","ACCEPTED","ARRIVED","FEEDBACK_RECORDED");
    private final ReferralMapper referrals;private final PatientMapper patients;private final PatientAccess access;private final AuditService audit;private final OrgService orgs;private final SlaResolver sla;private final PatientService patientService;
    public ReferralService(ReferralMapper referrals,PatientMapper patients,PatientAccess access,AuditService audit,OrgService orgs,SlaResolver sla,PatientService patientService){this.referrals=referrals;this.patients=patients;this.access=access;this.audit=audit;this.orgs=orgs;this.sla=sla;this.patientService=patientService;}
    public Paged<ReferralResponse> query(ReferralQueryRequest req){
        log.info("query referrals direction={} status={}",req.direction(),req.status());access.staff();var actor=CurrentAccount.get();
        ReferralExample ex=new ReferralExample();ex.eq("hospital_id",actor.hospitalId());
        if(req.patientId()!=null){access.require(req.patientId());ex.eq("patient_id",req.patientId());}
        else if("OPERATOR".equals(actor.roleCode())){PatientExample scope=access.scope();scope.selectColumns("id");PageHelper.startPage(1,2000,false);ex.in("patient_id",patients.selectByExample(scope).stream().map(p->p.id).toList());}
        if(Checks.text(req.direction()))ex.eq("direction",req.direction());if(Checks.text(req.referralType()))ex.eq("referral_type",req.referralType());if(Checks.text(req.status()))ex.eq("status",req.status());
        if(req.fromOrgId()!=null)ex.eq("from_org_id",req.fromOrgId());if(req.toOrgId()!=null)ex.eq("to_org_id",req.toOrgId());
        if(Boolean.TRUE.equals(req.open()))ex.in("status",OPEN);
        if(Boolean.TRUE.equals(req.overdue()))ex.in("status",List.of("INITIATED","ACCEPTED")).lt("sla_due_at",LocalDateTime.now());
        if(req.from()!=null)ex.ge("initiated_at",req.from().atStartOfDay());if(req.to()!=null)ex.lt("initiated_at",req.to().plusDays(1).atStartOfDay());
        ex.setOrderByClause("status ASC,sla_due_at ASC,id DESC");PageHelper.startPage(Paged.number(req.page()),Paged.size(req.size()));
        List<Referral> rows=referrals.selectByExample(ex);Map<Long,Patient> names=names(rows.stream().map(r->r.patientId).distinct().toList());
        return Paged.of(rows,r->view(r,names.get(r.patientId)));
    }
    @Transactional
    public ReferralResponse create(CreateReferralRequest req){
        log.info("create referral patientId={} direction={}",req.patientId(),req.direction());access.staff();Patient p=access.lock(req.patientId());
        Referral existing=byKey(p.hospitalId,req.requestKey());if(existing!=null){Checks.conflict(p.id.equals(existing.patientId));return view(existing,p);}
        Checks.require(req.fromOrgId()!=null||req.toOrgId()!=null,"Name the sending or receiving organisation / 请填写转出或接收机构");
        orgs.requireOrg(req.fromOrgId());orgs.requireOrg(req.toOrgId());
        ReferralExample open=new ReferralExample();open.eq("hospital_id",p.hospitalId).eq("patient_id",p.id).in("status",List.of("INITIATED","ACCEPTED"));
        Checks.require(referrals.countByExample(open)==0,"Patient already has a referral in progress / 患者已有进行中的转诊");
        String risk=req.riskLevel()==null?p.riskLevel:req.riskLevel();LocalDateTime at=req.initiatedAt()==null?LocalDateTime.now():req.initiatedAt();
        Referral r=new Referral();r.hospitalId=p.hospitalId;r.patientId=p.id;r.direction=req.direction();r.referralType=req.referralType();r.fromOrgId=req.fromOrgId();r.toOrgId=req.toOrgId();r.reason=req.reason().trim();r.riskLevel=risk;r.initiatedAt=at;
        r.slaDueAt=at.plusDays(sla.resolve(risk).arrivalDays);r.status="INITIATED";r.evidence=req.evidence().trim();r.actorId=CurrentAccount.get().userId();r.requestKey=req.requestKey();r.version=0;r.creator=r.actorId.toString();
        referrals.insertSelective(r);audit.append(p.id,"REFERRAL_INITIATED",r.id,null,"INITIATED",req.direction()+"/"+req.referralType()+"; SLA due="+r.slaDueAt);
        if("OUTBOUND".equals(req.direction())&&"UPWARD".equals(req.referralType()))patientService.advance(p,"CONTACTED","Referral "+r.id+" initiated");
        return view(referrals.selectByPrimaryKey(r.id),p);
    }
    @Transactional
    public ReferralResponse transition(TransitionReferralRequest req){
        log.info("transition referral id={} action={}",req.id(),req.action());access.staff();Referral r=referrals.selectByPrimaryKey(req.id());
        Checks.found(r!=null&&CurrentAccount.get().hospitalId().equals(r.hospitalId));Patient p=access.lock(r.patientId);Checks.conflict(req.version().equals(r.version));
        LocalDateTime at=req.at()==null?LocalDateTime.now():req.at();Referral patch=new Referral();
        switch(req.action()){
            case "ACCEPT"->{Checks.conflict("INITIATED".equals(r.status));Checks.require(Checks.text(req.evidence()),"Record the acceptance evidence / 请记录对方接收凭证");patch.status="ACCEPTED";patch.acceptedAt=at;}
            case "ARRIVE"->{Checks.conflict(List.of("INITIATED","ACCEPTED").contains(r.status));Checks.require(Checks.text(req.evidence()),"Arrival evidence required / 请填写到达核验证据");patch.status="ARRIVED";patch.arrivedAt=at;if(r.acceptedAt==null)patch.acceptedAt=at;}
            case "FEEDBACK"->{Checks.conflict(List.of("ACCEPTED","ARRIVED").contains(r.status));Checks.require(Checks.text(req.feedbackDiagnosis())&&Checks.text(req.feedbackDisposition()),"Diagnosis and disposition required / 请记录反馈的诊断与处置");
                patientService.validateClinician(req.feedbackClinicianId());patch.status="FEEDBACK_RECORDED";patch.feedbackAt=at;patch.feedbackDepartment=req.feedbackDepartment();patch.feedbackClinicianId=req.feedbackClinicianId();patch.feedbackDiagnosis=req.feedbackDiagnosis().trim();patch.feedbackDisposition=req.feedbackDisposition().trim();}
            case "CLOSE"->{Checks.conflict(List.of("ARRIVED","FEEDBACK_RECORDED").contains(r.status));patch.status="CLOSED";}
            case "REJECT"->{Checks.conflict(List.of("INITIATED","ACCEPTED").contains(r.status));Checks.require(Checks.text(req.reason()),"Rejection reason required / 请填写拒绝或退回原因");patch.status="REJECTED";patch.feedbackDisposition="退回："+req.reason().trim();}
            default->throw new IllegalArgumentException("Unknown action");
        }
        if(Checks.text(req.evidence()))patch.evidence=req.evidence().trim();
        patch.version=r.version+1;patch.modifier=CurrentAccount.get().userId().toString();ReferralExample ex=new ReferralExample();ex.eq("id",r.id).eq("hospital_id",r.hospitalId).eq("version",r.version);
        Checks.conflict(referrals.updateByExampleSelective(patch,ex)==1);audit.append(p.id,"REFERRAL_"+req.action(),r.id,r.status,patch.status,Checks.text(req.reason())?req.reason():"");
        if("ARRIVE".equals(req.action()))patientService.advance(p,"ARRIVED","Referral "+r.id+" arrived");
        if("CLOSE".equals(req.action())&&"OUTBOUND".equals(r.direction)&&"UPWARD".equals(r.referralType)&&"CLOSED".equals(patch.status)&&Checks.text(req.reason())&&"TRANSFERRED".equals(req.reason()))patientService.advance(p,"TRANSFERRED","Referral "+r.id+" closed as transferred");
        return view(referrals.selectByPrimaryKey(r.id),p);
    }
    private Referral byKey(Long hospitalId,String key){ReferralExample ex=new ReferralExample();ex.eq("hospital_id",hospitalId).eq("request_key",key);PageHelper.startPage(1,1,false);List<Referral> rows=referrals.selectByExample(ex);return rows.isEmpty()?null:rows.getFirst();}
    private Map<Long,Patient> names(List<Long> ids){if(ids.isEmpty())return Map.of();PatientExample ex=new PatientExample();ex.eq("hospital_id",CurrentAccount.get().hospitalId()).in("id",ids);ex.selectColumns("id","name");PageHelper.startPage(1,100,false);return patients.selectByExample(ex).stream().collect(Collectors.toMap(x->x.id,Function.identity()));}
    public static ReferralResponse view(Referral r,Patient p){
        boolean overdue=List.of("INITIATED","ACCEPTED").contains(r.status)&&r.slaDueAt!=null&&r.slaDueAt.isBefore(LocalDateTime.now());
        return new ReferralResponse(r.id,r.patientId,p==null?"":PatientService.maskName(p.name),r.direction,r.referralType,r.fromOrgId,r.toOrgId,r.reason,r.riskLevel,r.initiatedAt,r.slaDueAt,r.status,r.acceptedAt,r.arrivedAt,r.feedbackDepartment,r.feedbackClinicianId,r.feedbackDiagnosis,r.feedbackDisposition,r.feedbackAt,r.evidence,r.actorId,r.version,overdue);
    }
}
