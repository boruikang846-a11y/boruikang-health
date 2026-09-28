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
import java.time.LocalDateTime;
import java.util.List;
@Service
public class RecordService {
    private static final Logger log=LoggerFactory.getLogger(RecordService.class);
    private final CareRecordMapper records;private final CareTaskMapper tasks;private final PatientAccess access;private final AuditService audit;
    public RecordService(CareRecordMapper records,CareTaskMapper tasks,PatientAccess access,AuditService audit){this.records=records;this.tasks=tasks;this.access=access;this.audit=audit;}
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
        log.info("create clinical record patientId={} type={}",req.patientId(),req.recordType());access.staff();Patient p=access.lock(req.patientId());
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
        if(Boolean.TRUE.equals(r.needsContact))createTask(p,r,"ALERT","患者上报后请求团队联系",LocalDateTime.now().plusHours(4),"P1");
        audit.append(p.id,"OBSERVATION_RECORDED",r.id,null,"RECORDED","Patient-reported; no automated diagnosis");return view(records.selectByPrimaryKey(r.id));
    }
    private CareRecord base(Patient p){CareRecord r=new CareRecord();r.hospitalId=p.hospitalId;r.patientId=p.id;r.creator=CurrentAccount.get().userId().toString();r.needsContact=false;return r;}
    private void createTask(Patient p,CareRecord r,String type,String title,LocalDateTime due,String priority){
        CareTask t=new CareTask();t.hospitalId=p.hospitalId;t.patientId=p.id;t.taskType=type;t.title=title;t.priority=priority;t.status="PENDING";
        t.assigneeId=p.ownerId;t.doctorId=p.doctorId;t.dueAt=due;t.recordId=r.id;t.requestKey="record-"+r.id+"-"+type;t.version=0;t.creator=r.creator;tasks.insertSelective(t);
        audit.append(p.id,"TASK_CREATED",t.id,null,"PENDING","Linked record="+r.id);
    }
    public static RecordResponse view(CareRecord r){return new RecordResponse(r.id,r.patientId,r.recordType,r.occurredAt,r.content,r.medicationCycleDays,r.nextVisitDate,r.systolic,r.diastolic,r.heartRate,r.weight,r.glucose,r.needsContact,r.sourceSystem,r.gmtCreate,r.externalId);}
}
