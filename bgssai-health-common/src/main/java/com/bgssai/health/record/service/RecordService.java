package com.bgssai.health.record.service;
import com.bgssai.health.audit.service.AuditService;
import com.bgssai.health.auth.service.CurrentAccount;
import com.bgssai.health.common.*;
import com.bgssai.health.common.dto.PageRequest;
import com.bgssai.health.mapper.*;
import com.bgssai.health.model.*;
import com.bgssai.health.patient.service.PatientAccess;
import com.bgssai.health.record.dto.*;
import com.github.pagehelper.PageHelper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.bgssai.health.patient.service.PatientService;
import org.springframework.transaction.annotation.Propagation;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
@Service
public class RecordService {
    private static final Logger log=LoggerFactory.getLogger(RecordService.class);
    private final CareRecordMapper records;private final CareTaskMapper tasks;private final PatientMapper patients;private final PatientAccess access;private final AuditService audit;
    public RecordService(CareRecordMapper records,CareTaskMapper tasks,PatientMapper patients,PatientAccess access,AuditService audit){this.records=records;this.tasks=tasks;this.patients=patients;this.access=access;this.audit=audit;}
    /** Report types the responsible doctor reads; staff-entered vital signs (OBSERVATION) are not part of the worklist. */
    public static final List<String> REPORT_TYPES=List.of("DISCHARGE","OUTPATIENT","EXAM");
    private static final int SCOPE_LIMIT=2000;
    public Paged<ReportResponse> reports(ReportQueryRequest req){
        log.info("doctor reports viewed={} type={}",req.viewed(),req.recordType());access.doctor();
        CareRecordExample ex=reportScope(req.patientId());
        if(Checks.text(req.recordType()))ex.eq("record_type",req.recordType());
        if(Boolean.TRUE.equals(req.viewed()))ex.isNotNull("doctor_viewed_at");
        if(Boolean.FALSE.equals(req.viewed()))ex.isNull("doctor_viewed_at");
        ex.setOrderByClause("occurred_at DESC,id DESC");
        PageHelper.startPage(Paged.number(req.page()),Paged.size(req.size()));
        List<CareRecord> rows=records.selectByExample(ex);
        Map<Long,Patient> owners=patientsOf(rows.stream().map(r->r.patientId).distinct().toList());
        return Paged.of(rows,r->report(r,owners.get(r.patientId)));
    }
    public long unreadReports(){access.doctor();CareRecordExample ex=reportScope(null);ex.isNull("doctor_viewed_at");return records.countByExample(ex);}
    private CareRecordExample reportScope(Long patientId){
        CareRecordExample ex=new CareRecordExample();ex.eq("hospital_id",CurrentAccount.get().hospitalId()).in("record_type",REPORT_TYPES);
        if(patientId!=null){access.require(patientId);ex.eq("patient_id",patientId);}
        else ex.in("patient_id",access.scopedPatientIds(SCOPE_LIMIT));
        return ex;
    }
    /** First confirmation records who read the report and when; later calls only update the doctor's opinion. */
    @Transactional
    public ReportResponse review(ReviewRecordRequest req){
        log.info("doctor confirms report recordId={}",req.id());access.doctor();
        CareRecord r=records.selectByPrimaryKey(req.id());Checks.found(r!=null&&CurrentAccount.get().hospitalId().equals(r.hospitalId));
        Patient p=access.lock(r.patientId);access.responsibleDoctor(p);
        Checks.require(REPORT_TYPES.contains(r.recordType),"Only discharge, outpatient and exam reports need a doctor's read confirmation / 只有出院、门诊、体检报告需要医生确认已阅");
        String opinion=Checks.text(req.opinion())?req.opinion().trim():null;
        Long me=CurrentAccount.get().userId();
        CareRecord patch=new CareRecord();patch.doctorViewerId=me;patch.modifier=me.toString();patch.doctorOpinion=opinion;
        CareRecordExample ex=new CareRecordExample();ex.eq("id",r.id).eq("hospital_id",r.hospitalId);
        if(r.doctorViewedAt==null){
            patch.doctorViewedAt=LocalDateTime.now().withNano(0);ex.isNull("doctor_viewed_at");
            Checks.conflict(records.updateByExampleSelective(patch,ex)==1);
            audit.append(p.id,"REPORT_VIEWED_BY_DOCTOR",r.id,null,"VIEWED",opinion==null?"Read confirmed":"Read confirmed with opinion");
        } else {
            Checks.require(opinion!=null,"Enter the updated opinion / 请填写要更新的医生意见");
            Checks.conflict(records.updateByExampleSelective(patch,ex)==1);
            audit.append(p.id,"REPORT_OPINION_UPDATED",r.id,"VIEWED","VIEWED","Doctor opinion updated");
        }
        return report(records.selectByPrimaryKey(r.id),p);
    }
    /** Runs inside the doctor's task review: reviewing advice built on a report counts as reading that report. */
    @Transactional(propagation=Propagation.MANDATORY)
    public void markViewed(Long recordId,Patient p,String detail){
        CareRecord r=records.selectByPrimaryKey(recordId);
        if(r==null||!p.id.equals(r.patientId)||r.doctorViewedAt!=null||!REPORT_TYPES.contains(r.recordType))return;
        CareRecord patch=new CareRecord();patch.doctorViewedAt=LocalDateTime.now().withNano(0);patch.doctorViewerId=CurrentAccount.get().userId();patch.modifier=patch.doctorViewerId.toString();
        CareRecordExample ex=new CareRecordExample();ex.eq("id",r.id).eq("hospital_id",r.hospitalId).isNull("doctor_viewed_at");
        if(records.updateByExampleSelective(patch,ex)==1)audit.append(p.id,"REPORT_VIEWED_BY_DOCTOR",r.id,null,"VIEWED",detail);
    }
    private Map<Long,Patient> patientsOf(List<Long> ids){
        if(ids.isEmpty())return Map.of();PatientExample ex=new PatientExample();ex.eq("hospital_id",CurrentAccount.get().hospitalId()).in("id",ids);
        ex.selectColumns("id","name","department","disease");PageHelper.startPage(1,100,false);
        return patients.selectByExample(ex).stream().collect(Collectors.toMap(x->x.id,Function.identity()));
    }
    private static ReportResponse report(CareRecord r,Patient p){
        return new ReportResponse(r.id,r.patientId,p==null?"":PatientService.maskName(p.name),p==null?null:p.department,p==null?null:p.disease,r.recordType,r.occurredAt,r.content,
            r.medicationCycleDays,r.nextVisitDate,r.sourceSystem,r.externalId,r.doctorViewedAt,r.doctorViewerId,r.doctorOpinion,r.gmtCreate);
    }
    public Paged<RecordResponse> query(RecordQueryRequest req){
        log.info("query records patientId={}",req.patientId());access.staff();Patient p=access.require(req.patientId());return query(p,req.page(),req.size(),req.recordType());
    }
    public Paged<RecordResponse> own(PageRequest req){log.info("query own records accountId={}",CurrentAccount.get().userId());return query(access.own(true),req.page(),req.size(),null);}
    private Paged<RecordResponse> query(Patient p,Integer page,Integer size,String type){
        CareRecordExample ex=new CareRecordExample();ex.eq("hospital_id",p.hospitalId).eq("patient_id",p.id);if(Checks.text(type))ex.eq("record_type",type);ex.setOrderByClause("occurred_at DESC,id DESC");
        PageHelper.startPage(Paged.number(page),Paged.size(size));
        List<CareRecord> rows=records.selectByExample(ex);return Paged.of(rows,RecordService::view);
    }
    @Transactional
    public RecordResponse create(CreateRecordRequest req){return create(req,"MANUAL",null);}
    @Transactional
    public RecordResponse importHospital(CreateRecordRequest req,String sourceSystem,String externalId){
        access.manager();Checks.require("HOSPITAL_MOCK".equals(sourceSystem)&&Checks.text(externalId),"Invalid hospital source");
        return create(req,sourceSystem,externalId);
    }
    private RecordResponse create(CreateRecordRequest req,String sourceSystem,String externalId){
        log.info("create clinical record patientId={} type={}",req.patientId(),req.recordType());access.operations();Patient p=access.lock(req.patientId());
        Checks.require(req.nextVisitDate()==null||req.nextVisitDate().getYear()<2100,"Invalid next visit date");
        CareRecord r=base(p);r.recordType=req.recordType();r.occurredAt=req.occurredAt();r.content=req.content();r.medicationCycleDays=req.medicationCycleDays();r.nextVisitDate=req.nextVisitDate();r.sourceSystem=sourceSystem;r.externalId=externalId;
        records.insertSelective(r);createTask(p,r,"FOLLOWUP","DISCHARGE".equals(r.recordType)?"核对出院报告并准备随访":"核对就诊记录并准备随访",LocalDateTime.now().plusDays(1),"P2");
        if(r.nextVisitDate!=null)createTask(p,r,"REVISIT","按记录核对复诊安排",r.nextVisitDate.atTime(9,0),"P2");
        audit.append(p.id,"CLINICAL_RECORD_CREATED",r.id,null,r.recordType,"Source="+sourceSystem+"; follow-up created");return view(records.selectByPrimaryKey(r.id));
    }
    @Transactional
    public RecordResponse observation(CreateObservationRequest req){
        log.info("create observation accountId={}",CurrentAccount.get().userId());Patient p=access.lock(access.own(true).id);
        Checks.require(req.systolic()!=null||req.heartRate()!=null||req.weight()!=null||req.glucose()!=null||Checks.text(req.content()),"Enter a measurement or note / 请至少填写一项指标或身体感受");
        Checks.require((req.systolic()==null)==(req.diastolic()==null),"Both blood pressure values are required / 请同时填写收缩压和舒张压");
        Checks.require(req.systolic()==null||req.systolic().compareTo(req.diastolic())>0,"Check blood pressure input / 请核对血压输入");
        CareRecord r=base(p);r.recordType="OBSERVATION";r.occurredAt=req.occurredAt();r.content=req.content();r.systolic=req.systolic();r.diastolic=req.diastolic();
        r.heartRate=req.heartRate();r.weight=req.weight();r.glucose=req.glucose();r.needsContact=Boolean.TRUE.equals(req.needsContact());r.sourceSystem="PATIENT_WEB";
        records.insertSelective(r);
        if(Boolean.TRUE.equals(r.needsContact))createAlert(p,r,"患者上报后请求团队联系","PATIENT_REPORT");
        audit.append(p.id,"OBSERVATION_RECORDED",r.id,null,"RECORDED","Patient-reported; no automated diagnosis");return view(records.selectByPrimaryKey(r.id));
    }
    @Transactional
    public RecordResponse observe(StaffObservationRequest req){
        log.info("staff observation patientId={}",req.patientId());access.operations();Patient p=access.lock(req.patientId());
        Checks.require(req.systolic()!=null||req.heartRate()!=null||req.weight()!=null||req.glucose()!=null||Checks.text(req.content()),"Enter a measurement or note / 请至少填写一项指标或身体感受");
        Checks.require((req.systolic()==null)==(req.diastolic()==null),"Both blood pressure values are required / 请同时填写收缩压和舒张压");
        Checks.require(req.systolic()==null||req.systolic().compareTo(req.diastolic())>0,"Check blood pressure input / 请核对血压输入");
        CareRecord r=base(p);r.recordType="OBSERVATION";r.occurredAt=req.occurredAt();r.content=req.content();r.systolic=req.systolic();r.diastolic=req.diastolic();
        r.heartRate=req.heartRate();r.weight=req.weight();r.glucose=req.glucose();r.needsContact=Boolean.TRUE.equals(req.needsContact());r.sourceSystem="STAFF_ENTRY";
        records.insertSelective(r);
        if(Boolean.TRUE.equals(r.needsContact))createAlert(p,r,"指标异常，需医生判断","OBSERVATION");
        audit.append(p.id,"OBSERVATION_RECORDED",r.id,null,"RECORDED","Staff-entered on behalf of patient; source="+req.source());return view(records.selectByPrimaryKey(r.id));
    }
    private void createAlert(Patient p,CareRecord r,String title,String source){
        CareTask t=new CareTask();t.hospitalId=p.hospitalId;t.patientId=p.id;t.taskType="ALERT";t.title=title;t.priority="P1";t.status="PENDING";t.alertSource=source;
        t.assigneeId=p.ownerId;t.doctorId=p.doctorId;t.dueAt=LocalDateTime.now().plusHours(4);t.slaDueAt=LocalDateTime.now().plusHours(24);t.recordId=r.id;t.requestKey="record-"+r.id+"-ALERT";t.version=0;t.creator=r.creator;tasks.insertSelective(t);
        audit.append(p.id,"TASK_CREATED",t.id,null,"PENDING","ALERT source="+source+"; record="+r.id);
    }
    private CareRecord base(Patient p){CareRecord r=new CareRecord();r.hospitalId=p.hospitalId;r.patientId=p.id;r.creator=CurrentAccount.get().userId().toString();r.needsContact=false;return r;}
    private void createTask(Patient p,CareRecord r,String type,String title,LocalDateTime due,String priority){
        CareTask t=new CareTask();t.hospitalId=p.hospitalId;t.patientId=p.id;t.taskType=type;t.title=title;t.priority=priority;t.status="PENDING";
        t.assigneeId=p.ownerId;t.doctorId=p.doctorId;t.dueAt=due;t.recordId=r.id;t.requestKey="record-"+r.id+"-"+type;t.version=0;t.creator=r.creator;tasks.insertSelective(t);
        audit.append(p.id,"TASK_CREATED",t.id,null,"PENDING","Linked record="+r.id);
    }
    public static RecordResponse view(CareRecord r){return new RecordResponse(r.id,r.patientId,r.recordType,r.occurredAt,r.content,r.medicationCycleDays,r.nextVisitDate,r.systolic,r.diastolic,r.heartRate,r.weight,r.glucose,r.needsContact,r.sourceSystem,r.gmtCreate,r.externalId,r.doctorViewedAt,r.doctorViewerId,r.doctorOpinion);}
}
