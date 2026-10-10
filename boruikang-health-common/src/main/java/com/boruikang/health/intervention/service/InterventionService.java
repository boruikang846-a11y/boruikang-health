package com.boruikang.health.intervention.service;

import com.boruikang.health.audit.service.AuditService;
import com.boruikang.health.auth.service.CurrentAccount;
import com.boruikang.health.common.*;
import com.boruikang.health.intervention.dto.*;
import com.boruikang.health.mapper.*;
import com.boruikang.health.model.*;
import com.boruikang.health.patient.service.PatientAccess;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.pagehelper.PageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.*;

/** Operational work, scoped to the patient's current team. Clinical text never bypasses personal review. */
@Service
public class InterventionService {
    private final InterventionWorkMapper works; private final InterventionLogMapper logs;
    private final PatientMapper patients; private final CareRecordMapper records;
    private final PatientAccess access; private final AuditService audit; private final ObjectMapper json;
    private static final List<String> OPEN=List.of("TODO","ACTIVE","REVIEW","READY");
    public InterventionService(InterventionWorkMapper works,InterventionLogMapper logs,PatientMapper patients,CareRecordMapper records,PatientAccess access,AuditService audit,ObjectMapper json){
        this.works=works;this.logs=logs;this.patients=patients;this.records=records;this.access=access;this.audit=audit;this.json=json;
    }
    private InterventionWorkExample scope(QueryInterventionsRequest req){
        access.staff();var a=CurrentAccount.get();var ex=new InterventionWorkExample();ex.eq("hospital_id",a.hospitalId()).eq("center",req.center());
        if(access.executor())ex.setScopedOwnerId(a.userId());if(access.isDoctor())ex.setScopedDoctorId(a.userId());
        if(req.patientId()!=null){access.require(req.patientId());ex.eq("patient_id",req.patientId());}
        if(Checks.text(req.phase()))ex.eq("phase",req.phase());
        if(Checks.text(req.keyword()))ex.like("title","%"+req.keyword().trim()+"%");
        return ex;
    }
    public InterventionQueryResponse query(QueryInterventionsRequest req){
        var metrics=new LinkedHashMap<String,Long>();metrics.put("total",works.countByExample(scope(req)));
        for(String state:List.of("TODO","ACTIVE","REVIEW","READY","RESOLVED","CLOSED")){var ex=scope(req);ex.eq("status",state);metrics.put(state.toLowerCase(),works.countByExample(ex));}
        var overdue=scope(req);overdue.in("status",OPEN).lt("due_at",LocalDateTime.now());metrics.put("overdue",works.countByExample(overdue));
        var arrived=scope(req);arrived.isNotNull("arrived_at");metrics.put("arrived",works.countByExample(arrived));
        var rated=scope(req);rated.isNotNull("score");metrics.put("rated",works.countByExample(rated));
        var positive=scope(req);positive.ge("score",4);metrics.put("positive",works.countByExample(positive));
        var complaints=scope(req);complaints.eq("category","投诉协办").ne("status","CLOSED");metrics.put("complaints",works.countByExample(complaints));
        var ex=scope(req);if(Checks.text(req.status()))ex.eq("status",req.status());
        if(Boolean.TRUE.equals(req.overdue()))ex.in("status",OPEN).lt("due_at",LocalDateTime.now());ex.setOrderByClause("due_at ASC,id DESC");
        PageHelper.startPage(Paged.number(req.page()),Paged.size(req.size()));List<InterventionWork> rows=works.selectByExample(ex);
        return new InterventionQueryResponse(Paged.of(rows,w->view(w,false)),metrics);
    }
    public InterventionResponse get(GetInterventionRequest req){access.staff();var w=required(req.id());access.require(w.patientId);return view(w,true);}
    private InterventionWork required(Long id){var w=works.selectByPrimaryKey(id);Checks.found(w!=null&&CurrentAccount.get().hospitalId().equals(w.hospitalId));return w;}
    private void record(Patient p,Long id){var report=id==null?null:records.selectByPrimaryKey(id);Checks.require(report!=null&&p.id.equals(report.patientId)&&p.hospitalId.equals(report.hospitalId),"请关联该患者的原始报告");}
    private boolean approved(InterventionWork w,Patient p){return "READY".equals(w.status)&&Objects.equals(w.reviewerId,p.doctorId)&&Objects.equals(w.content,w.approvedContent);}
    @Transactional public InterventionResponse save(SaveInterventionRequest req){
        access.operations();Patient p=access.lock(req.patientId());
        Checks.require(req.dueAt().isBefore(LocalDateTime.now().plusYears(5)),"截止时间不能超过未来五年");
        InterventionWork old=req.id()==null?null:required(req.id());
        if(old!=null){Checks.found(p.id.equals(old.patientId));Checks.conflict(Objects.equals(req.version(),old.version));Checks.require(!List.of("RESOLVED","CLOSED").contains(old.status),"请先重新打开工作单再修改");Checks.require(!Boolean.TRUE.equals(old.clinical)||req.clinical(),"已关联临床审核的工作单不能改为普通服务");}
        if(req.clinical()||req.recordId()!=null)record(p,req.recordId());
        // An unlinked report is allowed only for ordinary service; zero is never a valid record id.
        InterventionWork w=old==null?new InterventionWork():works.selectByPrimaryKey(old.id);String before=old==null?null:snapshot(old);
        w.hospitalId=p.hospitalId;w.patientId=p.id;w.center=req.center();w.phase=req.phase();w.category=req.category().trim();w.title=req.title().trim();w.content=req.content().trim();w.clinical=req.clinical();w.recordId=req.recordId();w.dueAt=req.dueAt();
        w.status=old==null?"TODO":"ACTIVE";w.approvedContent="";w.reviewerId=0L;w.acknowledgedBy=0L;
        if(old!=null&&w.firstResponseAt==null)w.firstResponseAt=LocalDateTime.now();
        if(old==null){w.version=0;w.creator=CurrentAccount.get().userId().toString();works.insertSelective(w);}else{update(w,old.version);}
        append(w,old==null?"CREATE":"EDIT",req.reason(),before);return view(works.selectByPrimaryKey(w.id),true);
    }
    @Transactional public InterventionResponse act(ActInterventionRequest req){
        access.staff();var initial=required(req.id());Patient p=access.lock(initial.patientId);var w=required(req.id());Checks.conflict(Objects.equals(req.version(),w.version));
        String before=snapshot(w);int version=w.version;String action=req.action();
        if(List.of("APPROVE","REJECT","ACKNOWLEDGE").contains(action))access.responsibleDoctor(p);
        else if(!"NOTE".equals(action))access.operations();
        switch(action){
            case "START"->{Checks.require("TODO".equals(w.status),"仅待处理工作单可以开始");w.status="ACTIVE";if(w.firstResponseAt==null)w.firstResponseAt=LocalDateTime.now();}
            case "SUBMIT"->{Checks.require(Boolean.TRUE.equals(w.clinical)&&(List.of("TODO","ACTIVE").contains(w.status)||("READY".equals(w.status)&&!approved(w,p))),"请先完善临床工作单草稿");record(p,w.recordId);w.status="REVIEW";w.approvedContent="";w.reviewerId=0L;w.acknowledgedBy=0L;if(w.firstResponseAt==null)w.firstResponseAt=LocalDateTime.now();}
            case "APPROVE"->{Checks.require(Boolean.TRUE.equals(w.clinical)&&"REVIEW".equals(w.status),"工作单不在待审核状态");record(p,w.recordId);var report=records.selectByPrimaryKey(w.recordId);Checks.require(Objects.equals(report.doctorViewerId,p.doctorId)&&report.doctorViewedAt!=null,"请先在原报告页面本人确认已阅");w.status="READY";w.approvedContent=w.content;w.reviewerId=CurrentAccount.get().userId();}
            case "REJECT"->{Checks.require("REVIEW".equals(w.status),"仅待审核工作单可以退回");w.status="ACTIVE";w.approvedContent="";w.reviewerId=0L;w.acknowledgedBy=0L;}
            case "COMPLETE"->{Checks.require(List.of("ACTIVE","READY").contains(w.status),"请先开始处理或完成医生审核");Checks.require(!w.clinical||approved(w,p),"临床内容需当前责任医生本人审核通过");Checks.require(!w.clinical||p.consentAt!=null,"请先核验患者服务授权");w.result=req.note().trim();w.status="RESOLVED";}
            case "ACKNOWLEDGE"->{Checks.require(Boolean.TRUE.equals(w.clinical)&&"RESOLVED".equals(w.status),"仅已登记结果的临床工作单需要查收");w.acknowledgedBy=p.doctorId;}
            case "CLOSE"->{Checks.require("RESOLVED".equals(w.status),"请先登记办理结果");Checks.require(!w.clinical||Objects.equals(w.acknowledgedBy,p.doctorId),"请先由当前责任医生查收结果");w.status="CLOSED";}
            case "REOPEN"->{Checks.require(List.of("CLOSED","RESOLVED").contains(w.status),"当前工作单已经打开");w.status="ACTIVE";w.approvedContent="";w.reviewerId=0L;w.acknowledgedBy=0L;}
            case "NOTE"->{Checks.require(!"CLOSED".equals(w.status),"已闭环工作单需重新打开后补充");}
            case "ARRIVAL"->{Checks.require(req.occurredAt()!=null&&!req.occurredAt().isAfter(LocalDateTime.now()),"请填写实际到院时间，不能使用未来时间");Checks.require(!req.occurredAt().isBefore(w.gmtCreate.minusYears(1)),"到院时间超出工作单核验范围");Checks.require(w.arrivedAt==null,"已核验到院，请在操作记录中补充更正依据");w.arrivedAt=req.occurredAt();w.arrivalEvidence=req.note().trim();}
            case "RATE"->{Checks.require(List.of("RESOLVED","CLOSED").contains(w.status)&&req.score()!=null,"请在登记结果后填写1至5分患者评价");Checks.require(w.score==null,"该工作单已经登记评价");w.score=req.score();w.feedback=req.note().trim();}
            default->throw new IllegalArgumentException("Unknown action");
        }
        update(w,version);append(w,action,req.note(),before);return view(works.selectByPrimaryKey(w.id),true);
    }
    private void update(InterventionWork w,int version){w.version=version+1;w.modifier=CurrentAccount.get().userId().toString();var ex=new InterventionWorkExample();ex.eq("id",w.id).eq("hospital_id",w.hospitalId).eq("version",version);Checks.conflict(works.updateByExampleSelective(w,ex)==1);}
    private String snapshot(InterventionWork w){try{return json.writeValueAsString(w);}catch(Exception e){throw new IllegalStateException("Unable to record work snapshot",e);}}
    private void append(InterventionWork w,String action,String note,String before){var l=new InterventionLog();l.hospitalId=w.hospitalId;l.patientId=w.patientId;l.workId=w.id;l.actorId=CurrentAccount.get().userId();l.action=action;l.note=note.trim();l.beforeJson=before;l.afterJson=snapshot(w);l.creator=l.actorId.toString();logs.insertSelective(l);audit.append(w.patientId,"INTERVENTION_"+action,w.id,null,w.status,"服务工作单 #"+w.id+" / "+w.title);}
    private InterventionResponse view(InterventionWork w,boolean details){
        Patient p=patients.selectByPrimaryKey(w.patientId);var history=new ArrayList<InterventionResponse.Log>();
        if(details){var ex=new InterventionLogExample();ex.eq("hospital_id",w.hospitalId).eq("work_id",w.id);ex.setOrderByClause("id DESC");for(var l:logs.selectByExample(ex))history.add(new InterventionResponse.Log(l.id,l.actorId,l.action,l.note,l.beforeJson,l.afterJson,l.gmtCreate));}
        CareRecord report=details&&w.recordId!=null?records.selectByPrimaryKey(w.recordId):null;
        String status=w.status;
        return new InterventionResponse(w.id,w.patientId,p.name,p.ownerId,p.doctorId,w.center,w.phase,w.category,w.title,w.content,w.clinical,w.recordId,report==null?null:report.content,w.dueAt,status,w.approvedContent,w.reviewerId,w.result,w.firstResponseAt,w.arrivedAt,w.arrivalEvidence,w.score,w.feedback,w.version,w.gmtCreate,w.acknowledgedBy,history);
    }
}
