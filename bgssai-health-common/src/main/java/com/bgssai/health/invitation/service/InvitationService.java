package com.bgssai.health.invitation.service;
import com.bgssai.health.audit.service.AuditService;
import com.bgssai.health.auth.service.CurrentAccount;
import com.bgssai.health.common.*;
import com.bgssai.health.invitation.dto.*;
import com.bgssai.health.mapper.*;
import com.bgssai.health.model.*;
import com.bgssai.health.org.service.OrgService;
import com.bgssai.health.org.service.SlaResolver;
import com.bgssai.health.patient.service.PatientAccess;
import com.bgssai.health.patient.service.PatientService;
import com.bgssai.health.task.service.OutreachService;
import com.github.pagehelper.PageHelper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
@Service
public class InvitationService {
    private static final Logger log=LoggerFactory.getLogger(InvitationService.class);
    public static final List<String> UNREACHED=List.of("NO_ANSWER","BUSY","WRONG_NUMBER");
    private final InvitationMapper invitations;private final PatientMapper patients;private final ScreeningRecordMapper screenings;private final PatientAccess access;private final AuditService audit;
    private final PatientService patientService;private final OutreachService outreach;private final OrgService orgs;private final SlaResolver sla;
    public InvitationService(InvitationMapper invitations,PatientMapper patients,ScreeningRecordMapper screenings,PatientAccess access,AuditService audit,PatientService patientService,OutreachService outreach,OrgService orgs,SlaResolver sla){
        this.invitations=invitations;this.patients=patients;this.screenings=screenings;this.access=access;this.audit=audit;this.patientService=patientService;this.outreach=outreach;this.orgs=orgs;this.sla=sla;}
    public Paged<InvitationResponse> query(InvitationQueryRequest req){
        log.info("query invitations patientId={} result={}",req.patientId(),req.result());access.staff();var actor=CurrentAccount.get();
        InvitationExample ex=new InvitationExample();ex.eq("hospital_id",actor.hospitalId());
        if(req.patientId()!=null){access.require(req.patientId());ex.eq("patient_id",req.patientId());}
        else {access.operations();if(access.executor())ex.eq("actor_id",actor.userId());}
        if(req.screeningId()!=null)ex.eq("screening_id",req.screeningId());
        if(req.campaignId()!=null)ex.eq("campaign_id",req.campaignId());
        if(Checks.text(req.result()))ex.eq("result",req.result());
        if(Checks.text(req.method()))ex.eq("method",req.method());
        if(req.actorId()!=null)ex.eq("actor_id",req.actorId());
        if(Boolean.TRUE.equals(req.reached()))for(String r:UNREACHED)ex.ne("result",r);
        if(Boolean.FALSE.equals(req.reached()))ex.in("result",UNREACHED);
        if(req.invitedFrom()!=null)ex.ge("invited_at",req.invitedFrom().atStartOfDay());
        if(req.invitedTo()!=null)ex.lt("invited_at",req.invitedTo().plusDays(1).atStartOfDay());
        ex.setOrderByClause("invited_at DESC,id DESC");
        PageHelper.startPage(Paged.number(req.page()),Paged.size(req.size()));
        List<Invitation> rows=invitations.selectByExample(ex);Map<Long,Patient> names=names(rows.stream().map(r->r.patientId).distinct().toList());
        return Paged.of(rows,r->view(r,names.get(r.patientId)));
    }
    @Transactional
    public InvitationResponse create(CreateInvitationRequest req){
        log.info("record invitation patientId={} result={}",req.patientId(),req.result());access.operations();Patient p=access.lock(req.patientId());
        Invitation existing=byKey(p.hospitalId,req.requestKey());if(existing!=null){Checks.conflict(p.id.equals(existing.patientId));return view(existing,p);}
        Checks.require(!List.of("CLOSED","TRANSFERRED").contains(p.lifecycle),"Patient is closed or transferred / 患者已结案或转出");
        orgs.requireCampaign(req.campaignId());
        if(req.screeningId()!=null){ScreeningRecord s=screenings.selectByPrimaryKey(req.screeningId());Checks.require(s!=null&&p.hospitalId.equals(s.hospitalId)&&p.id.equals(s.patientId),"Screening record must belong to this patient / 筛查记录与患者不符");}
        boolean reached=!UNREACHED.contains(req.result());
        Checks.require(reached||req.nextInviteAt()!=null&&req.nextInviteAt().isAfter(req.invitedAt()),"Plan the next invitation time when the patient was not reached / 未联系上时请填写下次邀约时间");
        Checks.require(!"WILLING".equals(req.result())||Checks.text(req.plannedVisitMode()),"Record how the patient plans to come / 愿意到院时请记录到院方式");
        InvitationExample count=new InvitationExample();count.eq("hospital_id",p.hospitalId).eq("patient_id",p.id);int round=(int)invitations.countByExample(count)+1;
        Invitation row=new Invitation();row.hospitalId=p.hospitalId;row.patientId=p.id;row.screeningId=req.screeningId();row.campaignId=req.campaignId();row.round=round;row.invitedAt=req.invitedAt();row.method=req.method();
        row.result=req.result();row.plannedVisitMode=req.plannedVisitMode();row.summary=req.summary().trim();row.nextInviteAt=req.nextInviteAt();row.actorId=CurrentAccount.get().userId();row.evidence=req.evidence().trim();row.requestKey=req.requestKey();row.creator=row.actorId.toString();
        invitations.insertSelective(row);audit.append(p.id,"INVITATION_RECORDED",row.id,null,req.result(),"round="+round+"; method="+req.method());
        if(reached){
            patientService.touchContact(p,req.invitedAt());outreach.complete(p,req.result(),req.evidence());
            if("DECEASED".equals(req.result()))patientService.advance(p,"CLOSED","Invitation result DECEASED");
            else if(List.of("ALREADY_TREATED","TREATED_ELSEWHERE").contains(req.result()))patientService.advance(p,"CONTACTED","Invitation reached: "+req.result());
            else patientService.advance(p,"CONTACTED","Invitation reached: "+req.result());
        } else {
            outreach.progress(p,req.result(),req.nextInviteAt());
            int consecutive=consecutiveUnreached(p);int threshold=sla.resolve(p.riskLevel).lostAfterAttempts;
            if(consecutive>=threshold)outreach.escalateLost(p,consecutive);
        }
        return view(invitations.selectByPrimaryKey(row.id),p);
    }
    private int consecutiveUnreached(Patient p){
        InvitationExample ex=new InvitationExample();ex.eq("hospital_id",p.hospitalId).eq("patient_id",p.id);ex.setOrderByClause("invited_at DESC,id DESC");ex.selectColumns("id","result");
        PageHelper.startPage(1,20,false);int n=0;for(Invitation i:invitations.selectByExample(ex)){if(UNREACHED.contains(i.result))n++;else break;}return n;
    }
    private Invitation byKey(Long hospitalId,String key){InvitationExample ex=new InvitationExample();ex.eq("hospital_id",hospitalId).eq("request_key",key);PageHelper.startPage(1,1,false);List<Invitation> rows=invitations.selectByExample(ex);return rows.isEmpty()?null:rows.getFirst();}
    private Map<Long,Patient> names(List<Long> ids){if(ids.isEmpty())return Map.of();PatientExample ex=new PatientExample();ex.eq("hospital_id",CurrentAccount.get().hospitalId()).in("id",ids);ex.selectColumns("id","name");PageHelper.startPage(1,100,false);return patients.selectByExample(ex).stream().collect(Collectors.toMap(r->r.id,Function.identity()));}
    public static InvitationResponse view(Invitation i,Patient p){
        return new InvitationResponse(i.id,i.patientId,p==null?"":PatientService.maskName(p.name),i.screeningId,i.campaignId,i.round,i.invitedAt,i.method,i.result,!UNREACHED.contains(i.result),i.plannedVisitMode,i.summary,i.nextInviteAt,i.actorId,i.evidence,i.gmtCreate);
    }
}
