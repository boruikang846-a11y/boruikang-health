package com.bgssai.health.screening.service;
import com.bgssai.health.audit.service.AuditService;
import com.bgssai.health.auth.service.CurrentAccount;
import com.bgssai.health.common.*;
import com.bgssai.health.mapper.*;
import com.bgssai.health.model.*;
import com.bgssai.health.org.service.OrgService;
import com.bgssai.health.patient.dto.CreatePatientRequest;
import com.bgssai.health.patient.dto.PatientResponse;
import com.bgssai.health.patient.service.PatientAccess;
import com.bgssai.health.patient.service.PatientService;
import com.bgssai.health.screening.dto.*;
import com.bgssai.health.task.service.OutreachService;
import com.github.pagehelper.PageHelper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
/** Pre-enrollment patient pool: screening findings are imported or typed in, judged, then enrolled as managed patients. */
@Service
public class ScreeningService {
    private static final Logger log=LoggerFactory.getLogger(ScreeningService.class);
    private final ScreeningRecordMapper screenings;private final PatientAccess access;private final AuditService audit;private final OrgService orgs;private final PatientService patients;private final OutreachService outreach;
    public ScreeningService(ScreeningRecordMapper screenings,PatientAccess access,AuditService audit,OrgService orgs,PatientService patients,OutreachService outreach){
        this.screenings=screenings;this.access=access;this.audit=audit;this.orgs=orgs;this.patients=patients;this.outreach=outreach;}
    public Paged<ScreeningResponse> query(ScreeningQueryRequest req){
        log.info("query screenings status={} source={}",req.poolStatus(),req.sourceType());access.operations();var actor=CurrentAccount.get();
        ScreeningRecordExample ex=new ScreeningRecordExample();ex.eq("hospital_id",actor.hospitalId());
        if(access.executor())ex.eq("owner_id",actor.userId());
        if(Checks.text(req.keyword()))ex.like("name","%"+req.keyword().trim()+"%");
        if(Checks.text(req.sourceType()))ex.eq("source_type",req.sourceType());
        if(Checks.text(req.poolStatus()))ex.eq("pool_status",req.poolStatus());
        if(Checks.text(req.riskLevel()))ex.eq("risk_level",req.riskLevel());
        if(req.orgId()!=null)ex.eq("org_id",req.orgId());
        if(req.campaignId()!=null)ex.eq("campaign_id",req.campaignId());
        if(req.ownerId()!=null)ex.eq("owner_id",req.ownerId());
        if(Checks.text(req.importBatch()))ex.eq("import_batch",req.importBatch());
        if(req.screenedFrom()!=null)ex.ge("screened_at",req.screenedFrom().atStartOfDay());
        if(req.screenedTo()!=null)ex.lt("screened_at",req.screenedTo().plusDays(1).atStartOfDay());
        ex.setOrderByClause("pool_status ASC,screened_at DESC,id DESC");
        PageHelper.startPage(Paged.number(req.page()),Paged.size(req.size()));
        List<ScreeningRecord> rows=screenings.selectByExample(ex);return Paged.of(rows,r->view(r,true));
    }
    @Transactional
    public ScreeningResponse create(CreateScreeningRequest req){
        log.info("create screening source={}",req.sourceType());access.operations();var actor=CurrentAccount.get();
        Long ownerId=owner(req.ownerId());orgs.requireOrg(req.orgId());orgs.requireCampaign(req.campaignId());
        if(Checks.text(req.externalId())){ScreeningRecord dup=byExternal(actor.hospitalId(),req.sourceType(),req.externalId());if(dup!=null)return view(dup,false);}
        ScreeningRecord r=new ScreeningRecord();r.hospitalId=actor.hospitalId();r.orgId=req.orgId();r.campaignId=req.campaignId();r.ownerId=ownerId;r.sourceType=req.sourceType();
        r.name=req.name().trim();r.gender=req.gender();r.age=req.age();r.phone=req.phone().trim();r.idCardTail=req.idCardTail();r.screenedAt=req.screenedAt();r.finding=req.finding().trim();r.category=req.category();
        r.riskLevel="UNKNOWN";r.poolStatus="NEW";r.externalId=Checks.text(req.externalId())?req.externalId().trim():null;r.note=req.note();r.version=0;r.creator=actor.userId().toString();
        screenings.insertSelective(r);audit.append(null,"SCREENING_CREATED",r.id,null,"NEW",r.sourceType);return view(screenings.selectByPrimaryKey(r.id),false);
    }
    @Transactional
    public ImportScreeningResponse importRows(ImportScreeningRequest req){
        log.info("import screenings batch={} rows={}",req.importBatch(),req.rows().size());access.operations();var actor=CurrentAccount.get();
        Long ownerId=owner(req.ownerId());orgs.requireOrg(req.orgId());orgs.requireCampaign(req.campaignId());
        ScreeningRecordExample batch=new ScreeningRecordExample();batch.eq("hospital_id",actor.hospitalId()).eq("import_batch",req.importBatch());
        Checks.require(screenings.countByExample(batch)==0,"Import batch already used / 该导入批次号已使用，请换一个批次号");
        int created=0,skipped=0;List<String> messages=new ArrayList<>();
        for(int i=0;i<req.rows().size();i++){
            var row=req.rows().get(i);String externalId=Checks.text(row.externalId())?row.externalId().trim():null;
            if(externalId!=null&&byExternal(actor.hospitalId(),req.sourceType(),externalId)!=null){skipped++;messages.add("第"+(i+1)+"行：来源编号 "+externalId+" 已存在，跳过");continue;}
            ScreeningRecord r=new ScreeningRecord();r.hospitalId=actor.hospitalId();r.orgId=req.orgId();r.campaignId=req.campaignId();r.ownerId=ownerId;r.sourceType=req.sourceType();
            r.name=row.name().trim();r.gender=row.gender()==null?"UNKNOWN":row.gender();r.age=row.age();r.phone=row.phone().trim();r.idCardTail=row.idCardTail();
            r.screenedAt=row.screenedAt()==null?LocalDateTime.now():row.screenedAt();r.finding=row.finding().trim();r.category=row.category();r.riskLevel="UNKNOWN";r.poolStatus="NEW";
            r.externalId=externalId;r.importBatch=req.importBatch();r.version=0;r.creator=actor.userId().toString();screenings.insertSelective(r);created++;
        }
        audit.append(null,"SCREENING_IMPORTED",null,null,req.importBatch(),"source="+req.sourceType()+"; created="+created+"; skipped="+skipped);
        return new ImportScreeningResponse(req.importBatch(),created,skipped,messages);
    }
    @Transactional
    public ScreeningResponse judge(JudgeScreeningRequest req){
        log.info("judge screening id={} status={}",req.id(),req.poolStatus());access.operations();ScreeningRecord r=load(req.id(),req.version());
        Checks.conflict(!"ENROLLED".equals(r.poolStatus));
        ScreeningRecord patch=new ScreeningRecord();patch.poolStatus=req.poolStatus();patch.judgedBy=CurrentAccount.get().userId();patch.judgedAt=LocalDateTime.now();patch.note=req.note();
        switch(req.poolStatus()){
            case "HIGH_RISK"->{Checks.require(List.of("HIGH","CRITICAL").contains(req.riskLevel())&&Checks.text(req.riskEvidence()),"High risk requires HIGH or CRITICAL level with hospital evidence / 高危需填写风险等级及院方判定依据");patch.riskLevel=req.riskLevel();patch.riskEvidence=req.riskEvidence().trim();}
            case "NON_HIGH_RISK"->{Checks.require(Checks.text(req.nonHighRiskReason()),"Reason required / 请填写非高危原因");patch.riskLevel=req.riskLevel()==null?"LOW":req.riskLevel();patch.riskEvidence=req.riskEvidence();patch.nonHighRiskReason=req.nonHighRiskReason().trim();}
            default->{Checks.require(Checks.text(req.note()),"Discard reason required / 请填写作废原因");}
        }
        if(req.ownerId()!=null){patients.validateStaff(req.ownerId(),"OPERATOR","NURSE","MANAGER");patch.ownerId=req.ownerId();}
        save(r,patch,"SCREENING_JUDGED",req.poolStatus());return view(screenings.selectByPrimaryKey(r.id),false);
    }
    @Transactional
    public ScreeningResponse enroll(EnrollScreeningRequest req){
        log.info("enroll screening id={} existingPatientId={}",req.id(),req.existingPatientId());access.operations();ScreeningRecord r=load(req.id(),req.version());
        Checks.conflict(!"ENROLLED".equals(r.poolStatus)&&!"DISCARDED".equals(r.poolStatus));
        Checks.require(!"NEW".equals(r.poolStatus),"Judge the record before enrolling / 请先完成高危判定再建档");
        Patient p;
        if(req.existingPatientId()!=null){p=access.lock(req.existingPatientId());}
        else{
            Checks.require(Checks.text(req.department())&&Checks.text(req.disease()),"Department and disease required / 建档需填写科室与诊断");
            PatientResponse created=patients.create(new CreatePatientRequest(r.name,r.gender,r.age==null?0:r.age,r.phone,req.department().trim(),req.disease().trim(),req.doctorId(),req.ownerId()==null?r.ownerId:req.ownerId(),req.note(),
                null,null,null,null,null,null,null,req.patientType(),req.sourceScene()==null?scene(r.sourceType):req.sourceScene(),r.orgId,null,null,null,
                "UNKNOWN".equals(r.riskLevel)?null:r.riskLevel,r.riskEvidence,false));
            p=access.lock(created.id());
        }
        if(!Boolean.FALSE.equals(req.outreach()))outreach.open(p,"outreach-screening-"+r.id,"Screening "+r.id+" enrolled");
        ScreeningRecord patch=new ScreeningRecord();patch.poolStatus="ENROLLED";patch.patientId=p.id;
        save(r,patch,"SCREENING_ENROLLED","ENROLLED");audit.append(p.id,"PATIENT_ENROLLED_FROM_SCREENING",r.id,r.poolStatus,"ENROLLED","source="+r.sourceType);
        return view(screenings.selectByPrimaryKey(r.id),false);
    }
    private static String scene(String sourceType){return switch(sourceType){case "ECG_NETWORK"->"ECG_NETWORK";case "EXAM"->"EXAM";case "OUTPATIENT"->"OUTPATIENT";case "INPATIENT"->"INPATIENT";case "CAMPAIGN"->"CAMPAIGN";default->"COMMUNITY_SCREENING";};}
    private Long owner(Long requested){var actor=CurrentAccount.get();if(access.executor()){Checks.permit(requested==null||actor.userId().equals(requested));return actor.userId();}
        if(requested==null)return actor.userId();patients.validateStaff(requested,"OPERATOR","NURSE","MANAGER");return requested;}
    private ScreeningRecord byExternal(Long hospitalId,String sourceType,String externalId){
        ScreeningRecordExample ex=new ScreeningRecordExample();ex.eq("hospital_id",hospitalId).eq("source_type",sourceType).eq("external_id",externalId);PageHelper.startPage(1,1,false);
        List<ScreeningRecord> rows=screenings.selectByExample(ex);return rows.isEmpty()?null:rows.getFirst();
    }
    private ScreeningRecord load(Long id,Integer version){
        ScreeningRecord r=screenings.selectByPrimaryKey(id);var actor=CurrentAccount.get();Checks.found(r!=null&&actor.hospitalId().equals(r.hospitalId));
        Checks.found("MANAGER".equals(actor.roleCode())||actor.userId().equals(r.ownerId));Checks.conflict(version.equals(r.version));return r;
    }
    private void save(ScreeningRecord before,ScreeningRecord patch,String action,String after){
        patch.version=before.version+1;patch.modifier=CurrentAccount.get().userId().toString();
        ScreeningRecordExample ex=new ScreeningRecordExample();ex.eq("id",before.id).eq("hospital_id",before.hospitalId).eq("version",before.version);
        Checks.conflict(screenings.updateByExampleSelective(patch,ex)==1);audit.append(before.patientId,action,before.id,before.poolStatus,after,"version="+patch.version);
    }
    public static ScreeningResponse view(ScreeningRecord r,boolean masked){
        var actor=CurrentAccount.get();boolean full=!masked||"MANAGER".equals(actor.roleCode())||actor.userId().equals(r.ownerId);
        return new ScreeningResponse(r.id,r.patientId,r.orgId,r.campaignId,r.ownerId,r.sourceType,full?r.name:PatientService.maskName(r.name),r.gender,r.age,full?r.phone:PatientService.maskPhone(r.phone),r.idCardTail,r.screenedAt,r.finding,r.category,
            r.riskLevel,r.riskEvidence,r.judgedBy,r.judgedAt,r.poolStatus,r.nonHighRiskReason,r.externalId,r.importBatch,r.note,r.version,r.gmtCreate);
    }
}
