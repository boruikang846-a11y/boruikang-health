package com.boruikang.health.continuity.service;

import com.boruikang.health.audit.service.AuditService;
import com.boruikang.health.auth.service.CurrentAccount;
import com.boruikang.health.common.Checks;
import com.boruikang.health.continuity.dto.*;
import com.boruikang.health.journey.service.ServiceAuthorization;
import com.boruikang.health.mapper.*;
import com.boruikang.health.model.*;
import com.boruikang.health.patient.service.PatientAccess;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.pagehelper.PageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Isolation;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

/** Mutations use current reads after the patient lock so concurrent consent withdrawal cannot be hidden by an older snapshot.
 * A patient's continuous programme survives individual encounter closure. No automatic clinical decisions. */
@Service
public class ContinuousCareService {
    private final ContinuousCarePlanMapper plans;
    private final ContinuousCareReviewMapper reviews;
    private final ContinuousCareJourneyMapper links;
    private final ServiceJourneyMapper journeys;
    private final PatientAccess access;
    private final ServiceAuthorization authorization;
    private final AuditService audit;
    private final ObjectMapper json;

    public ContinuousCareService(ContinuousCarePlanMapper plans,ContinuousCareReviewMapper reviews,
        ContinuousCareJourneyMapper links,ServiceJourneyMapper journeys,PatientAccess access,
        ServiceAuthorization authorization,AuditService audit,ObjectMapper json) {
        this.plans=plans;this.reviews=reviews;this.links=links;this.journeys=journeys;
        this.access=access;this.authorization=authorization;this.audit=audit;this.json=json;
    }

    public List<ContinuousCareResponse> query(ContinuousCareQueryRequest req) {
        access.staff();Patient p=access.require(req.patientId());
        return rows(p).stream().map(row->view(row,p)).toList();
    }

    private List<ContinuousCarePlan> rows(Patient p) {
        var ex=new ContinuousCarePlanExample();ex.eq("hospital_id",p.hospitalId).eq("patient_id",p.id);
        ex.setOrderByClause("id DESC");return plans.selectByExample(ex);
    }

    private Patient writable(Long patientId) {
        access.staff();Patient p=access.lock(patientId);
        Checks.require(authorization.active(p)&&!List.of("PAUSED","CLOSED").contains(p.lifecycle),"请先核实有效服务授权及患者在管状态");
        Checks.require(p.ownerId!=null&&p.doctorId!=null,"请先分派服务负责人和责任医生");return p;
    }

    private record Locked(ContinuousCarePlan plan,Patient patient) {}
    private Locked lock(Long id,Integer version) {
        access.staff();var initial=plans.selectByPrimaryKey(id);Checks.found(initial!=null);
        Patient p=writable(initial.patientId);
        var ex=new ContinuousCarePlanExample();ex.eq("id",id).eq("hospital_id",p.hospitalId).eq("patient_id",p.id);ex.setForUpdate(true);
        var rows=plans.selectByExample(ex);Checks.found(!rows.isEmpty());var plan=rows.getFirst();
        Checks.conflict(Objects.equals(version,plan.version));return new Locked(plan,p);
    }

    private void nextDate(LocalDate date) {Checks.require(date!=null&&!date.isBefore(LocalDate.now()),"下一次复盘日期不能早于今天");}
    private String approval(ContinuousCarePlan plan,Patient p) {
        return "APPROVED".equals(plan.approvalStatus)&&(!Objects.equals(plan.reviewerId,p.doctorId)||!Objects.equals(plan.consentKey,authorization.fingerprint(p)))?"REQUIRES_REVIEW":plan.approvalStatus;
    }
    private void currentApproved(ContinuousCarePlan plan,Patient p) {
        Checks.require("ACTIVE".equals(plan.status)&&"APPROVED".equals(approval(plan,p)),"需由当前责任医生审核有效计划后办理");
    }
    private void persist(ContinuousCarePlan old,ContinuousCarePlan patch) {
        patch.version=old.version+1;patch.modifier=CurrentAccount.get().userId().toString();
        var ex=new ContinuousCarePlanExample();ex.eq("id",old.id).eq("hospital_id",old.hospitalId).eq("version",old.version);
        Checks.conflict(plans.updateByExampleSelective(patch,ex)==1);
    }

    @Transactional(isolation=Isolation.READ_COMMITTED)
    public ContinuousCareResponse save(SaveContinuousCareRequest req) {
        nextDate(req.nextReviewDate());Patient p;ContinuousCarePlan plan;
        if(req.id()==null) {
            p=writable(req.patientId());
            var ex=new ContinuousCarePlanExample();ex.eq("hospital_id",p.hospitalId).eq("patient_id",p.id).eq("disease_code","AF").ne("status","CLOSED");
            Checks.require(plans.countByExample(ex)==0,"该患者已有未结束的房颤长期计划，请调整原计划");
            plan=new ContinuousCarePlan();plan.hospitalId=p.hospitalId;plan.patientId=p.id;plan.diseaseCode="AF";
            plan.consentKey=authorization.fingerprint(p);plan.status="ACTIVE";plan.approvalStatus="PENDING";plan.revision=1;plan.version=0;plan.creator=CurrentAccount.get().userId().toString();
            plan.baseline=req.baseline().trim();plan.goals=req.goals().trim();plan.patientInstructions=req.patientInstructions().trim();plan.nextReviewDate=req.nextReviewDate();
            plans.insertSelective(plan);
        } else {
            var locked=lock(req.id(),req.version());plan=locked.plan();p=locked.patient();
            Checks.require(p.id.equals(req.patientId()),"患者与计划不一致");Checks.require(!"CLOSED".equals(plan.status),"已结束计划保留历史，请建立新的管理周期");
            var patch=new ContinuousCarePlan();patch.baseline=req.baseline().trim();patch.goals=req.goals().trim();patch.patientInstructions=req.patientInstructions().trim();
            patch.consentKey=authorization.fingerprint(p);patch.nextReviewDate=req.nextReviewDate();patch.revision=plan.revision+1;patch.approvalStatus="PENDING";persist(plan,patch);plan=plans.selectByPrimaryKey(plan.id);
        }
        event(plan,"PLAN_SAVED",snapshot(plan),req.evidence(),"","UNKNOWN",null,plan.nextReviewDate);
        return view(plan,p);
    }

    @Transactional(isolation=Isolation.READ_COMMITTED)
    public ContinuousCareResponse approve(ApproveContinuousCareRequest req) {
        var locked=lock(req.id(),req.version());var plan=locked.plan();var p=locked.patient();access.responsibleDoctor(p);
        Checks.require(!"CLOSED".equals(plan.status),"已结束计划不能审核");
        Checks.require(!"APPROVED".equals(approval(plan,p)),"本版计划已审核");
        var patch=new ContinuousCarePlan();patch.approvalStatus=Boolean.TRUE.equals(req.approve())?"APPROVED":"REJECTED";
        patch.consentKey=authorization.fingerprint(p);patch.reviewerId=CurrentAccount.get().userId();patch.reviewedAt=LocalDateTime.now().withNano(0);persist(plan,patch);
        plan=plans.selectByPrimaryKey(plan.id);event(plan,patch.approvalStatus,snapshot(plan),req.evidence(),"","UNKNOWN",null,plan.nextReviewDate);
        return view(plan,p);
    }

    @Transactional(isolation=Isolation.READ_COMMITTED)
    public ContinuousCareResponse link(LinkContinuousJourneyRequest req) {
        var locked=lock(req.id(),req.version());var plan=locked.plan();var p=locked.patient();
        Checks.require(!"CLOSED".equals(plan.status),"已结束计划不能关联新旅程");
        var j=journeys.selectByPrimaryKey(req.journeyId());Checks.found(j!=null&&p.id.equals(j.patientId)&&p.hospitalId.equals(j.hospitalId));
        var ex=new ContinuousCareJourneyExample();ex.eq("plan_id",plan.id).eq("journey_id",j.id);
        if(links.countByExample(ex)>0)return view(plan,p);
        var row=new ContinuousCareJourney();row.hospitalId=p.hospitalId;row.patientId=p.id;row.planId=plan.id;row.journeyId=j.id;row.creator=CurrentAccount.get().userId().toString();links.insertSelective(row);
        persist(plan,new ContinuousCarePlan());plan=plans.selectByPrimaryKey(plan.id);
        event(plan,"JOURNEY_LINKED","关联就医旅程 #"+j.id,req.evidence(),"","UNKNOWN",j.id,null);return view(plan,p);
    }

    @Transactional(isolation=Isolation.READ_COMMITTED)
    public ContinuousCareResponse review(ReviewContinuousCareRequest req) {
        nextDate(req.nextReviewDate());var locked=lock(req.id(),req.version());var plan=locked.plan();var p=locked.patient();
        access.responsibleDoctor(p);currentApproved(plan,p);
        if(req.journeyId()!=null) {var ex=new ContinuousCareJourneyExample();ex.eq("plan_id",plan.id).eq("journey_id",req.journeyId());Checks.require(links.countByExample(ex)>0,"请先关联本患者的复盘依据旅程");}
        Checks.oneOf(req.assessment(),"ON_TRACK","NEEDS_ADJUSTMENT","UNKNOWN");
        var patch=new ContinuousCarePlan();patch.nextReviewDate=req.nextReviewDate();persist(plan,patch);plan=plans.selectByPrimaryKey(plan.id);
        event(plan,"STAGE_REVIEW",req.summary(),req.evidence(),req.patientMessage(),req.assessment(),req.journeyId(),req.nextReviewDate());return view(plan,p);
    }

    @Transactional(isolation=Isolation.READ_COMMITTED)
    public ContinuousCareResponse transition(TransitionContinuousCareRequest req) {
        var locked=lock(req.id(),req.version());var plan=locked.plan();var p=locked.patient();var patch=new ContinuousCarePlan();
        switch(req.action()) {
            case "PAUSE" -> {Checks.require("ACTIVE".equals(plan.status),"仅进行中计划可以暂停");patch.status="PAUSED";}
            case "RESUME" -> {Checks.require("PAUSED".equals(plan.status),"仅暂停计划可以恢复");patch.status="ACTIVE";}
            case "CLOSE" -> {access.responsibleDoctor(p);Checks.require(!"CLOSED".equals(plan.status),"计划已经结束");patch.status="CLOSED";}
            default -> throw new IllegalArgumentException("Unsupported continuous care action");
        }
        persist(plan,patch);plan=plans.selectByPrimaryKey(plan.id);event(plan,req.action(),"长期管理状态："+patch.status,req.evidence(),"","UNKNOWN",null,null);return view(plan,p);
    }

    private String snapshot(ContinuousCarePlan plan) {
        try{return json.writeValueAsString(Map.of("baseline",plan.baseline,"goals",plan.goals,"patient_instructions",plan.patientInstructions,"next_review_date",plan.nextReviewDate.toString(),"revision",plan.revision));}
        catch(JsonProcessingException ex){throw new IllegalStateException("Cannot preserve plan revision",ex);}
    }
    private void event(ContinuousCarePlan plan,String kind,String summary,String evidence,String patientMessage,String assessment,Long journeyId,LocalDate nextDate) {
        var row=new ContinuousCareReview();row.hospitalId=plan.hospitalId;row.patientId=plan.patientId;row.planId=plan.id;row.revision=plan.revision;
        row.kind=kind;row.summary=summary;row.evidence=evidence.trim();row.patientMessage=patientMessage.trim();row.assessment=assessment;row.journeyId=journeyId;
        row.actorId=CurrentAccount.get().userId();row.nextReviewDate=nextDate;row.creator=row.actorId.toString();reviews.insertSelective(row);
        audit.append(plan.patientId,"CONTINUITY_"+kind,plan.id,null,plan.status,"revision="+plan.revision+"; review="+row.id);
    }
    private ContinuousCareResponse view(ContinuousCarePlan plan,Patient p) {
        var lx=new ContinuousCareJourneyExample();lx.eq("plan_id",plan.id).eq("hospital_id",p.hospitalId);
        var rx=new ContinuousCareReviewExample();rx.eq("plan_id",plan.id).eq("hospital_id",p.hospitalId);rx.setOrderByClause("id DESC");long count=reviews.countByExample(rx);
        PageHelper.startPage(1,100,false);var history=reviews.selectByExample(rx).stream().map(r->new ContinuousCareResponse.Review(r.id,r.revision,r.kind,r.summary,r.evidence,r.patientMessage,r.assessment,r.journeyId,r.actorId,r.nextReviewDate,r.gmtCreate)).toList();
        return new ContinuousCareResponse(plan.id,p.id,plan.diseaseCode,plan.status,approval(plan,p),plan.baseline,plan.goals,plan.patientInstructions,plan.nextReviewDate,plan.revision,plan.version,
            plan.reviewerId,plan.reviewedAt,links.selectByExample(lx).stream().map(r->r.journeyId).toList(),history,count);
    }

    /** Called only after an invited entry has verified the patient; never returns drafts or internal notes. */
    public record PatientPlan(Long id,String disease,String instructions,LocalDate nextReviewDate,String lastFeedback) {}
    public List<PatientPlan> patientPlans(Patient p) {
        if(!authorization.active(p)||List.of("PAUSED","CLOSED").contains(p.lifecycle))return List.of();
        return rows(p).stream().filter(plan->"ACTIVE".equals(plan.status)&&"APPROVED".equals(approval(plan,p))).map(plan->{
            var rx=new ContinuousCareReviewExample();rx.eq("hospital_id",p.hospitalId).eq("patient_id",p.id).eq("plan_id",plan.id).eq("revision",plan.revision).eq("kind","STAGE_REVIEW").eq("actor_id",p.doctorId);rx.setOrderByClause("id DESC");
            var ax=new ContinuousCareReviewExample();ax.eq("plan_id",plan.id).eq("kind","APPROVED");ax.setOrderByClause("id DESC");
            PageHelper.startPage(1,1,false);var approvals=reviews.selectByExample(ax);
            if(!approvals.isEmpty())rx.gt("id",approvals.getFirst().id);
            PageHelper.startPage(1,1,false);var recent=reviews.selectByExample(rx);
            return new PatientPlan(plan.id,"房颤",plan.patientInstructions,plan.nextReviewDate,recent.isEmpty()?null:recent.getFirst().patientMessage);
        }).toList();
    }
}
