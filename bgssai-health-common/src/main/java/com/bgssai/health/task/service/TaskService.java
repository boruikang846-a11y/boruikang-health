package com.bgssai.health.task.service;

import com.bgssai.health.audit.service.AuditService;
import com.bgssai.health.auth.service.CurrentAccount;
import com.bgssai.health.common.*;
import com.bgssai.health.common.dto.PageRequest;
import com.bgssai.health.integration.service.AiDraftService;
import com.bgssai.health.mapper.*;
import com.bgssai.health.model.*;
import com.bgssai.health.patient.service.PatientAccess;
import com.bgssai.health.task.dto.*;
import com.github.pagehelper.PageHelper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class TaskService {
    public static final List<String> TERMINAL=List.of("COMPLETED","CANCELLED");
    private static final Logger log=LoggerFactory.getLogger(TaskService.class);
    private final CareTaskMapper tasks;private final PatientMapper patients;private final CareRecordMapper records;
    private final CareMessageMapper messages;private final KnowledgeEntryMapper knowledge;private final PatientAccess access;
    private final AuditService audit;private final TaskWriter writer;private final AiDraftService ai;
    public TaskService(CareTaskMapper tasks,PatientMapper patients,CareRecordMapper records,CareMessageMapper messages,
        KnowledgeEntryMapper knowledge,PatientAccess access,AuditService audit,TaskWriter writer,AiDraftService ai) {
        this.tasks=tasks;this.patients=patients;this.records=records;this.messages=messages;this.knowledge=knowledge;
        this.access=access;this.audit=audit;this.writer=writer;this.ai=ai;
    }
    public Paged<TaskResponse> query(TaskQueryRequest req) {
        log.info("query tasks type={} status={} page={}",req.taskType(),req.status(),req.page());CareTaskExample ex=access.taskScope();
        if(req.patientId()!=null){access.require(req.patientId());ex.eq("patient_id",req.patientId());}
        if(Checks.text(req.taskType()))ex.eq("task_type",req.taskType());
        if(Checks.text(req.status()))ex.eq("status",req.status());
        if(Checks.text(req.priority()))ex.eq("priority",req.priority());
        if(Boolean.TRUE.equals(req.overdue()))ex.lt("due_at",LocalDateTime.now()).ne("status","COMPLETED").ne("status","CANCELLED");
        ex.setOrderByClause("priority ASC,due_at ASC,id ASC");
        PageHelper.startPage(Paged.number(req.page()),Paged.size(req.size()));
        List<CareTask> rows=tasks.selectByExample(ex);
        Map<Long,Patient> names=patientNames(rows.stream().map(r->r.patientId).distinct().toList());
        return Paged.of(rows,r->view(r,names.get(r.patientId)));
    }
    public TaskContextResponse context(Long id) {
        log.info("query task context taskId={}",id);access.staff();CareTask t=tasks.selectByPrimaryKey(id);
        Checks.found(t!=null&&CurrentAccount.get().hospitalId().equals(t.hospitalId));Patient p=access.require(t.patientId);
        CareRecord record=t.recordId==null?null:records.selectByPrimaryKey(t.recordId);
        if(record!=null)Checks.found(p.id.equals(record.patientId)&&p.hospitalId.equals(record.hospitalId));
        CareMessageExample ex=new CareMessageExample();ex.eq("hospital_id",p.hospitalId).eq("patient_id",p.id).eq("task_id",t.id);
        PageHelper.startPage(1,100,false);
        List<CareMessage> rows=messages.selectByExample(ex);
        return new TaskContextResponse(view(t,p),record==null?null:com.bgssai.health.record.service.RecordService.view(record),rows.stream().map(com.bgssai.health.message.service.MessageService::view).toList());
    }
    private Map<Long,Patient> patientNames(List<Long> ids) {
        if(ids.isEmpty())return Map.of();PatientExample ex=access.scope();ex.in("id",ids);ex.selectColumns("id","name");
        PageHelper.startPage(1,100,false);
        List<Patient> rows=patients.selectByExample(ex);return rows.stream().collect(Collectors.toMap(r->r.id,Function.identity()));
    }
    public Paged<PatientPlanResponse> plans(PageRequest req) {
        log.info("query own plans accountId={}",CurrentAccount.get().userId());Patient p=access.own(true);
        CareTaskExample ex=new CareTaskExample();ex.eq("hospital_id",p.hospitalId).eq("patient_id",p.id).in("task_type",List.of("FOLLOWUP","REVISIT"));
        ex.setOrderByClause("due_at ASC,id ASC");
        PageHelper.startPage(Paged.number(req.page()),Paged.size(req.size()));
        List<CareTask> rows=tasks.selectByExample(ex);
        return Paged.of(rows,r->new PatientPlanResponse(r.id,r.taskType,r.title,publicStatus(r.status),r.dueAt,r.completedAt));
    }
    private String publicStatus(String status) {
        return List.of("IN_PROGRESS","PENDING_REVIEW","REJECTED","APPROVED").contains(status)?"PREPARING":status;
    }
    @Transactional
    public TaskResponse create(CreateTaskRequest req) {
        log.info("create task patientId={} type={}",req.patientId(),req.taskType());access.staff();Patient p=access.lock(req.patientId());
        Checks.require(!List.of("PAUSED","CLOSED").contains(p.lifecycle)||"ALERT".equals(req.taskType()),"Patient management is paused / 患者已暂停或结案");
        Checks.require(req.dueAt().isAfter(LocalDateTime.now().minusYears(1))&&req.dueAt().isBefore(LocalDateTime.now().plusYears(3)),"Invalid due date");
        CareTaskExample duplicate=new CareTaskExample();duplicate.eq("hospital_id",p.hospitalId).eq("request_key",req.requestKey());
        PageHelper.startPage(1,1,false);
        List<CareTask> existing=tasks.selectByExample(duplicate);
        if(!existing.isEmpty()) {
            CareTask old=existing.getFirst();Checks.conflict(p.id.equals(old.patientId)&&req.taskType().equals(old.taskType)&&req.title().equals(old.title)&&req.dueAt().equals(old.dueAt));
            return view(old,p);
        }
        if(req.recordId()!=null){CareRecord record=records.selectByPrimaryKey(req.recordId());Checks.require(record!=null&&p.id.equals(record.patientId)&&p.hospitalId.equals(record.hospitalId),"Record must belong to patient");}
        if(req.sopId()!=null)publishedSop(req.sopId(),p.hospitalId);
        CareTask t=new CareTask();t.hospitalId=p.hospitalId;t.patientId=p.id;t.taskType=req.taskType();t.title=req.title();t.priority=req.priority();t.status="PENDING";
        t.assigneeId=p.ownerId;t.doctorId=p.doctorId;t.dueAt=req.dueAt();t.recordId=req.recordId();t.sopId=req.sopId();t.requestKey=req.requestKey();t.version=0;t.creator=CurrentAccount.get().userId().toString();
        tasks.insertSelective(t);audit.append(p.id,"TASK_CREATED",t.id,null,"PENDING",t.taskType);return view(t,p);
    }
    public TaskResponse claim(ClaimTaskRequest req) {
        log.info("claim task taskId={}",req.id());CareTask t=load(req.id(),req.version());Checks.conflict("PENDING".equals(t.status));
        Checks.require(!"REVISIT".equals(t.taskType),"Use booking action for revisit");
        CareTask patch=new CareTask();patch.status="IN_PROGRESS";return view(writer.save(t,patch,"TASK_CLAIMED"),access.require(t.patientId));
    }
    public TaskResponse draft(DraftTaskRequest req) {
        log.info("draft task taskId={} mode={}",req.id(),req.mode());CareTask t=load(req.id(),req.version());Patient p=access.require(t.patientId);
        Checks.require(List.of("FOLLOWUP","CONSULTATION").contains(t.taskType),"Task does not accept advice");
        Checks.conflict(List.of("IN_PROGRESS","REJECTED","APPROVED").contains(t.status));
        KnowledgeEntry sop=publishedSop(req.sopId(),p.hospitalId);
        String content;
        if("MANUAL".equals(req.mode())) {Checks.require(Checks.text(req.draftText()),"Draft text required");content=req.draftText().trim();}
        else if("AI".equals(req.mode())) {
            // External network I/O deliberately runs outside the short database write transaction.
            CareRecord record=t.recordId==null?null:records.selectByPrimaryKey(t.recordId);
            content=ai.generate(sop,record);
        } else content=template(sop,t.recordId==null?null:records.selectByPrimaryKey(t.recordId));
        Checks.require(content.length()<=6000,"Draft too long");
        CareTask patch=new CareTask();patch.sopId=sop.id;patch.draftText=content;patch.draftOrigin=req.mode();patch.status="IN_PROGRESS";patch.approvedText="";patch.reviewNote="";
        return view(writer.save(t,patch,"DRAFT_SAVED"),p);
    }
    public TaskResponse submit(SubmitReviewRequest req) {
        log.info("submit review taskId={}",req.id());CareTask t=load(req.id(),req.version());Patient p=access.require(t.patientId);
        Checks.conflict("IN_PROGRESS".equals(t.status));Checks.require(List.of("FOLLOWUP","CONSULTATION").contains(t.taskType)&&Checks.text(t.draftText),"Draft required");
        Checks.require(p.doctorId!=null,"Assign a doctor first / 请先绑定审核医生");
        CareTask patch=new CareTask();patch.status="PENDING_REVIEW";patch.doctorId=p.doctorId;
        return view(writer.save(t,patch,"REVIEW_SUBMITTED"),p);
    }
    public TaskResponse review(ReviewTaskRequest req) {
        log.info("review task taskId={} approved={}",req.id(),req.approved());CareTask t=load(req.id(),req.version());Patient p=access.require(t.patientId);access.doctor(p);
        Checks.conflict("PENDING_REVIEW".equals(t.status));
        Checks.require(Boolean.TRUE.equals(req.approved())?Checks.text(req.approvedText()):Checks.text(req.reviewNote()),"Approved text or rejection reason required");
        CareTask patch=new CareTask();patch.status=Boolean.TRUE.equals(req.approved())?"APPROVED":"REJECTED";
        patch.approvedText=Boolean.TRUE.equals(req.approved())?req.approvedText().trim():"";patch.reviewNote=req.reviewNote();patch.reviewerId=CurrentAccount.get().userId();patch.reviewedAt=LocalDateTime.now();
        return view(writer.save(t,patch,"DOCTOR_REVIEWED"),p);
    }
    @Transactional
    public TaskResponse contact(RecordContactRequest req) {
        log.info("record manual contact taskId={}",req.id());CareTask t=load(req.id(),req.version());Patient p=access.require(t.patientId);
        Checks.conflict("APPROVED".equals(t.status));Checks.require(Checks.text(t.approvedText)&&Objects.equals(t.reviewerId,p.doctorId),"Current responsible doctor approval required");
        Checks.require(Checks.text(req.evidence()),"Manual contact evidence required / 请填写实际人工联系的时间、方式和核验结果");
        CareTask patch=new CareTask();patch.status="CONTACTED";patch.evidence=req.evidence().trim();
        CareTask saved=writer.save(t,patch,"MANUAL_CONTACT_RECORDED");
        CareMessage m=new CareMessage();m.hospitalId=p.hospitalId;m.patientId=p.id;m.taskId=t.id;m.senderId=CurrentAccount.get().userId();m.senderRole=CurrentAccount.get().roleCode();
        m.direction="STAFF_TO_PATIENT";m.content=t.approvedText;m.creator=m.senderId.toString();messages.insertSelective(m);
        return view(saved,p);
    }
    public TaskResponse transition(TransitionTaskRequest req) {
        log.info("transition task taskId={} action={}",req.id(),req.action());CareTask t=load(req.id(),req.version());Patient p=access.require(t.patientId);
        Checks.conflict(!TERMINAL.contains(t.status));CareTask patch=new CareTask();
        switch(req.action()) {
            case "ESCALATE" -> {Checks.require("ALERT".equals(t.taskType),"Only alerts can escalate");Checks.conflict("IN_PROGRESS".equals(t.status));Checks.require(p.doctorId!=null,"Assign doctor first");patch.status="ESCALATED";}
            case "BOOK" -> {Checks.require("REVISIT".equals(t.taskType),"Only revisit");Checks.conflict(List.of("PENDING","NO_SHOW").contains(t.status));Checks.require(Checks.text(req.evidence()),"Booking details required / 请记录预约时间、科室及核验依据");patch.status="BOOKED";}
            case "ARRIVE" -> {Checks.require("REVISIT".equals(t.taskType),"Only revisit");Checks.conflict("BOOKED".equals(t.status));Checks.require(Checks.text(req.evidence()),"Arrival evidence required / 请填写到院核验证据");patch.status="ARRIVED";}
            case "NO_SHOW" -> {Checks.require("REVISIT".equals(t.taskType),"Only revisit");Checks.conflict("BOOKED".equals(t.status));Checks.require(Checks.text(req.outcome()),"Reason required");patch.status="NO_SHOW";}
            case "CANCEL" -> {Checks.require(!"ALERT".equals(t.taskType)&&!"CONTACTED".equals(t.status)&&!"ARRIVED".equals(t.status),"This task cannot be cancelled");Checks.require(Checks.text(req.outcome()),"Cancellation reason required");patch.status="CANCELLED";}
            case "COMPLETE" -> {
                Checks.require(Checks.text(req.outcome()),"Outcome required / 请记录处理结果");
                if("ALERT".equals(t.taskType)) {access.doctor(p);Checks.conflict("ESCALATED".equals(t.status));}
                else if("REVISIT".equals(t.taskType)) Checks.conflict("ARRIVED".equals(t.status));
                else Checks.conflict("CONTACTED".equals(t.status));
                patch.status="COMPLETED";patch.completedAt=LocalDateTime.now();
            }
            default -> throw new IllegalArgumentException("Unknown action");
        }
        patch.outcome=req.outcome();if(List.of("BOOK","ARRIVE").contains(req.action()))patch.evidence=req.evidence();return view(writer.save(t,patch,"TASK_"+req.action()),p);
    }
    private CareTask load(Long id,Integer version) {
        access.staff();CareTask t=tasks.selectByPrimaryKey(id);Checks.found(t!=null&&CurrentAccount.get().hospitalId().equals(t.hospitalId));access.require(t.patientId);
        Checks.conflict(version.equals(t.version));return t;
    }
    private KnowledgeEntry publishedSop(Long id,Long hospitalId) {
        KnowledgeEntry k=knowledge.selectByPrimaryKey(id);Checks.require(k!=null&&hospitalId.equals(k.hospitalId)&&"SOP".equals(k.kind)&&"PUBLISHED".equals(k.status),"Select a published SOP / 请选择运营团队已发布的 SOP");return k;
    }
    private String template(KnowledgeEntry sop,CareRecord record) {
        StringBuilder content=new StringBuilder("您好，健康管理团队希望了解您最近的情况。\n\n").append(sop.content);
        if(record!=null){
            String source="DISCHARGE".equals(record.recordType)?"出院报告":"原始就诊记录";
            content.append("\n\n结合您的").append(source).append("，本次还需要核对：");
            if(record.medicationCycleDays!=null)content.append("\n• 原记录载明的用药周期为 ").append(record.medicationCycleDays).append(" 天。请问按原医嘱执行时是否遇到困难？具体用法和后续安排请与医生核对。");
            if(record.nextVisitDate!=null)content.append("\n• 原记录建议复诊日期为 ").append(record.nextVisitDate).append("。请问是否已确认复诊安排，是否需要团队协助？");
            content.append("\n• 对原记录中的注意事项或后续安排，是否有希望医生解答的问题？");
        }
        return content.append("\n\n请按原医嘱执行，如有疑问请联系您的医生。").toString();
    }
    public static TaskResponse view(CareTask t,Patient patient) {
        String name=patient==null?"":patient.name.substring(0,1)+"*".repeat(Math.max(0,patient.name.length()-1));
        return new TaskResponse(t.id,t.patientId,name,t.taskType,t.title,t.priority,t.status,t.assigneeId,t.doctorId,t.dueAt,t.recordId,t.sopId,t.draftText,t.draftOrigin,t.approvedText,t.reviewNote,t.reviewerId,t.reviewedAt,t.completedAt,t.outcome,t.evidence,t.version,!TERMINAL.contains(t.status)&&t.dueAt.isBefore(LocalDateTime.now()));
    }
}
