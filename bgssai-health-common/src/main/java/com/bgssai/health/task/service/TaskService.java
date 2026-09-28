package com.bgssai.health.task.service;

import com.bgssai.health.audit.service.AuditService;
import com.bgssai.health.auth.service.CurrentAccount;
import com.bgssai.health.common.*;
import com.bgssai.health.common.dto.PageRequest;
import com.bgssai.health.integration.service.AiDraftService;
import com.bgssai.health.mapper.*;
import com.bgssai.health.model.*;
import com.bgssai.health.patient.service.PatientAccess;
import com.bgssai.health.patient.service.PatientService;
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
    private final AuditService audit;private final TaskWriter writer;private final AiDraftService ai;private final ContactAttemptMapper attempts;private final PatientService patientService;
    private static final List<String> FAILED_CONTACT=List.of("NO_ANSWER","BUSY","WRONG_NUMBER","REFUSED","IDENTITY_UNVERIFIED");
    public TaskService(CareTaskMapper tasks,PatientMapper patients,CareRecordMapper records,CareMessageMapper messages,
        KnowledgeEntryMapper knowledge,PatientAccess access,AuditService audit,TaskWriter writer,AiDraftService ai,ContactAttemptMapper attempts,PatientService patientService) {
        this.tasks=tasks;this.patients=patients;this.records=records;this.messages=messages;this.knowledge=knowledge;
        this.access=access;this.audit=audit;this.writer=writer;this.ai=ai;this.attempts=attempts;this.patientService=patientService;
    }
    public Paged<TaskResponse> query(TaskQueryRequest req) {
        log.info("query tasks type={} status={} page={}",req.taskType(),req.status(),req.page());CareTaskExample ex=access.taskScope();
        if(req.patientId()!=null){access.require(req.patientId());ex.eq("patient_id",req.patientId());}
        if(Checks.text(req.taskType()))ex.eq("task_type",req.taskType());
        if(Checks.text(req.status()))ex.eq("status",req.status());
        if(Checks.text(req.priority()))ex.eq("priority",req.priority());
        if(Boolean.TRUE.equals(req.overdue()))ex.lt("due_at",LocalDateTime.now()).ne("status","COMPLETED").ne("status","CANCELLED");
        if(req.assigneeId()!=null)ex.eq("assignee_id",req.assigneeId());
        if(Boolean.TRUE.equals(req.contactPending()))ex.in("contact_result",FAILED_CONTACT).ne("status","COMPLETED").ne("status","CANCELLED");
        if(Boolean.TRUE.equals(req.handoverPending()))ex.eq("handover_status","PENDING").eq("status","COMPLETED");
        if(Boolean.TRUE.equals(req.revisitPending()))ex.eq("task_type","REVISIT").in("status",List.of("PENDING","BOOKED","NO_SHOW"));
        if(req.dueFrom()!=null)ex.ge("due_at",req.dueFrom().atStartOfDay());
        if(req.dueTo()!=null)ex.lt("due_at",req.dueTo().plusDays(1).atStartOfDay());
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
        ContactAttemptExample ax=new ContactAttemptExample();ax.eq("hospital_id",p.hospitalId).eq("task_id",t.id);ax.setOrderByClause("contact_at DESC,id DESC");
        PageHelper.startPage(1,100,false);List<ContactAttempt> history=attempts.selectByExample(ax);
        return new TaskContextResponse(view(t,p),record==null?null:com.bgssai.health.record.service.RecordService.view(record),rows.stream().map(com.bgssai.health.message.service.MessageService::view).toList(),history.stream().map(TaskService::attemptView).toList());
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
        if(req.knowledgeId()!=null)publishedReference(req.knowledgeId(),p.hospitalId);
        CareTask t=new CareTask();t.hospitalId=p.hospitalId;t.patientId=p.id;t.taskType=req.taskType();t.title=req.title();t.priority=req.priority();t.status="PENDING";
        t.assigneeId=p.ownerId;t.doctorId=p.doctorId;t.dueAt=req.dueAt();t.recordId=req.recordId();t.sopId=req.knowledgeId();t.requestKey=req.requestKey();t.version=0;t.creator=CurrentAccount.get().userId().toString();
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
        KnowledgeEntry reference=req.knowledgeId()==null?null:publishedReference(req.knowledgeId(),p.hospitalId);
        String content;
        if("MANUAL".equals(req.mode())) {Checks.require(Checks.text(req.draftText()),"Draft text required");content=req.draftText().trim();}
        else if("AI".equals(req.mode())) {
            // External network I/O deliberately runs outside the short database write transaction.
            CareRecord record=t.recordId==null?null:records.selectByPrimaryKey(t.recordId);
            content=ai.generate(reference,record);
        } else content=template(reference,t.recordId==null?null:records.selectByPrimaryKey(t.recordId));
        Checks.require(content.length()<=6000,"Draft too long");
        CareTask patch=new CareTask();patch.sopId=reference==null?0L:reference.id;patch.draftText=content;patch.draftOrigin=req.mode();patch.status="IN_PROGRESS";patch.approvedText="";patch.reviewNote="";
        return view(writer.save(t,patch,"DRAFT_SAVED"),p);
    }
    public TaskResponse submit(SubmitReviewRequest req) {
        log.info("submit review taskId={}",req.id());CareTask t=load(req.id(),req.version());Patient p=access.require(t.patientId);
        Checks.conflict("IN_PROGRESS".equals(t.status));Checks.require(List.of("FOLLOWUP","CONSULTATION").contains(t.taskType)&&Checks.text(t.draftText),"Draft required");
        Checks.require(p.doctorId!=null,"Assign a hospital reviewing doctor first / 请先关联院方审核医生");patientService.validateClinician(p.doctorId);
        CareTask patch=new CareTask();patch.status="PENDING_REVIEW";patch.doctorId=p.doctorId;
        return view(writer.save(t,patch,"REVIEW_SUBMITTED"),p);
    }
    public TaskResponse review(ReviewTaskRequest req) {
        log.info("record hospital review taskId={} approved={}",req.id(),req.approved());CareTask t=load(req.id(),req.version());Patient p=access.require(t.patientId);
        Checks.conflict("PENDING_REVIEW".equals(t.status));
        Checks.require(p.doctorId!=null&&Objects.equals(t.doctorId,p.doctorId),"Current hospital doctor required");patientService.validateClinician(p.doctorId);
        Checks.require(req.reviewedAt()!=null&&!req.reviewedAt().isAfter(LocalDateTime.now())&&!req.reviewedAt().isBefore(t.gmtCreate.minusSeconds(2)),"Enter actual hospital review time");
        Checks.require(Checks.text(req.reviewEvidence()),"Record independently obtained hospital review evidence");
        Checks.require(Boolean.TRUE.equals(req.approved())?Checks.text(req.approvedText()):Checks.text(req.reviewNote()),"Approved text or rejection reason required");
        CareTask patch=new CareTask();patch.status=Boolean.TRUE.equals(req.approved())?"APPROVED":"REJECTED";
        patch.approvedText=Boolean.TRUE.equals(req.approved())?req.approvedText().trim():"";patch.reviewNote=req.reviewNote();patch.reviewerId=p.doctorId;patch.reviewedAt=req.reviewedAt();
        patch.reviewChannel=req.reviewChannel();patch.reviewEvidence=req.reviewEvidence().trim();
        return view(writer.save(t,patch,"HOSPITAL_REVIEW_EVIDENCE_RECORDED"),p);
    }
    @Transactional
    public TaskResponse contact(RecordContactRequest req) {
        log.info("record manual contact taskId={}",req.id());CareTask t=load(req.id(),req.version());Patient p=access.require(t.patientId);
        Checks.conflict("APPROVED".equals(t.status));Checks.require(Checks.text(t.approvedText)&&Checks.text(t.reviewEvidence)&&Objects.equals(t.reviewerId,p.doctorId),"Recorded current hospital doctor approval required");
        Checks.require(Checks.text(req.evidence()),"Manual contact evidence required / 请填写实际人工联系凭证");
        Checks.require(Boolean.TRUE.equals(req.identityVerified()),"Verify patient or authorized contact identity first / 请先核实本人或授权联系人身份");
        Checks.require(t.recordId==null||Boolean.TRUE.equals(req.reportReviewed()),"Review the linked report first / 请核对本任务关联的原报告");
        Checks.require(req.contactAt()!=null&&!req.contactAt().isAfter(LocalDateTime.now()),"Actual contact time required");
        Checks.require(List.of("PHONE","IN_PERSON","MANUAL_OTHER").contains(req.method())&&List.of("PATIENT","AUTHORIZED_CONTACT").contains(req.recipientRole()),"Invalid contact method or recipient");
        Checks.require(Checks.text(req.medicationFeedback())&&Checks.text(req.patientQuestions()),"Record the feedback and questions; explicitly state none or not applicable when appropriate");
        CareTask patch=new CareTask();patch.status="CONTACTED";patch.evidence=req.evidence().trim();patch.identityVerified=true;patch.contactResult="CONNECTED";
        CareTask saved=writer.save(t,patch,"MANUAL_CONTACT_RECORDED");
        CareMessage m=new CareMessage();m.hospitalId=p.hospitalId;m.patientId=p.id;m.taskId=t.id;m.senderId=CurrentAccount.get().userId();m.senderRole=CurrentAccount.get().roleCode();
        m.direction="STAFF_TO_PATIENT";m.content=t.approvedText;m.creator=m.senderId.toString();messages.insertSelective(m);
        ContactAttempt attempt=attemptBase(t,req.contactAt(),req.method(),"CONNECTED",req.evidence());
        attempt.identityVerified=true;attempt.reportReviewed=Boolean.TRUE.equals(req.reportReviewed());attempt.recipientRole=req.recipientRole();
        attempt.medicationFeedback=req.medicationFeedback();attempt.patientQuestions=req.patientQuestions();attempts.insertSelective(attempt);
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
                if("ALERT".equals(t.taskType)) {Checks.conflict("ESCALATED".equals(t.status));Checks.require(p.doctorId!=null&&Checks.text(req.evidence()),"Record the hospital clinician's disposition and evidence before closing an alert");patientService.validateClinician(p.doctorId);}
                else if("REVISIT".equals(t.taskType)) Checks.conflict("ARRIVED".equals(t.status));
                else Checks.conflict("CONTACTED".equals(t.status));
                patch.status="COMPLETED";patch.completedAt=LocalDateTime.now();
                if("FOLLOWUP".equals(t.taskType))patch.handoverStatus="PENDING";
            }
            default -> throw new IllegalArgumentException("Unknown action");
        }
        patch.outcome=req.outcome();if(List.of("BOOK","ARRIVE").contains(req.action())||("ALERT".equals(t.taskType)&&"COMPLETE".equals(req.action())))patch.evidence=req.evidence();return view(writer.save(t,patch,"TASK_"+req.action()),p);
    }
    @Transactional
    public TaskResponse attempt(RecordAttemptRequest req) {
        CareTask t=load(req.id(),req.version());Patient p=access.lock(t.patientId);
        Checks.require(List.of("FOLLOWUP","CONSULTATION").contains(t.taskType),"Only follow-up and consultation tasks accept contact attempts");
        Checks.conflict(!TERMINAL.contains(t.status)&&!"CONTACTED".equals(t.status));
        Checks.require(FAILED_CONTACT.contains(req.result()),"Invalid unsuccessful contact result");
        Checks.require(req.contactAt()!=null&&!req.contactAt().isAfter(LocalDateTime.now()),"Actual contact time required");
        Checks.require(req.nextContactAt()!=null&&req.nextContactAt().isAfter(req.contactAt())&&req.nextContactAt().isBefore(LocalDateTime.now().plusYears(1)),"Enter a later next action time within one year");
        Checks.require(Checks.text(req.reason())&&Checks.text(req.nextPlan())&&Checks.text(req.evidence()),"Reason, next plan and evidence are required");
        Checks.require(List.of("PHONE","IN_PERSON","MANUAL_OTHER").contains(req.method()),"Invalid method");
        CareTask patch=new CareTask();patch.nextContactAt=req.nextContactAt();patch.contactResult=req.result();
        CareTask saved=writer.save(t,patch,"CONTACT_ATTEMPT_RECORDED");
        ContactAttempt row=attemptBase(t,req.contactAt(),req.method(),req.result(),req.evidence());
        row.reason=req.reason();row.nextContactAt=req.nextContactAt();row.nextPlan=req.nextPlan();attempts.insertSelective(row);
        return view(saved,p);
    }
    @Transactional
    public List<TaskResponse> schedule(ScheduleFollowupsRequest req) {
        access.staff();Patient p=access.lock(req.patientId());
        Checks.require(!List.of("PAUSED","CLOSED").contains(p.lifecycle),"Patient management is paused or closed");
        CareRecord record=records.selectByPrimaryKey(req.recordId());
        Checks.require(record!=null&&p.id.equals(record.patientId)&&p.hospitalId.equals(record.hospitalId),"Record must belong to patient");
        Checks.require(req.nodes()!=null&&!req.nodes().isEmpty()&&req.nodes().size()<=12,"Select one to twelve explicit follow-up dates");
        Checks.require(Checks.text(req.requestKey())&&req.requestKey().matches("[a-zA-Z0-9-]{1,60}"),"Invalid scheduling request key");
        CareTaskExample batch=new CareTaskExample();batch.eq("hospital_id",p.hospitalId).like("request_key","schedule-"+req.requestKey()+"-%");
        long existingCount=tasks.countByExample(batch);Checks.conflict(existingCount==0||existingCount==req.nodes().size());
        for(var node:req.nodes()) {
            Checks.require(node!=null&&List.of("ENROLLMENT","D3","D7","D30","M3","Y1","CUSTOM").contains(node.stage())&&Checks.text(node.title()),"Confirm each node and title");
            Checks.require(node.dueAt()!=null&&!node.dueAt().isBefore(record.occurredAt)&&node.dueAt().isBefore(LocalDateTime.now().plusYears(3)),"Confirm a date after the original record and within three years");
        }
        List<TaskResponse> result=new java.util.ArrayList<>();
        for(int i=0;i<req.nodes().size();i++) {
            var node=req.nodes().get(i);String key="schedule-"+req.requestKey()+"-"+i;
            Checks.require(node.dueAt()!=null&&!node.dueAt().isBefore(record.occurredAt)&&node.dueAt().isBefore(LocalDateTime.now().plusYears(3)),"Confirm a date after the original record and within three years");
            CareTaskExample existing=new CareTaskExample();existing.eq("hospital_id",p.hospitalId).eq("request_key",key);PageHelper.startPage(1,1,false);
            List<CareTask> found=tasks.selectByExample(existing);
            if(!found.isEmpty()) {
                CareTask old=found.getFirst();Checks.conflict(p.id.equals(old.patientId)&&record.id.equals(old.recordId)&&node.stage().equals(old.followupStage)&&node.title().equals(old.title)&&node.dueAt().equals(old.dueAt));
                result.add(view(old,p));continue;
            }
            CareTask t=new CareTask();t.hospitalId=p.hospitalId;t.patientId=p.id;t.taskType="FOLLOWUP";t.title=node.title();t.priority="P2";t.status="PENDING";
            t.assigneeId=p.ownerId;t.doctorId=p.doctorId;t.dueAt=node.dueAt();t.recordId=record.id;t.followupStage=node.stage();t.requestKey=key;t.version=0;t.creator=CurrentAccount.get().userId().toString();
            tasks.insertSelective(t);audit.append(p.id,"FOLLOWUP_SCHEDULED",t.id,null,"PENDING","Manually confirmed node="+node.stage());result.add(view(tasks.selectByPrimaryKey(t.id),p));
        }
        return result;
    }
    public TaskResponse acknowledge(AcknowledgeTaskRequest req) {
        CareTask t=load(req.id(),req.version());Patient p=access.require(t.patientId);
        Checks.conflict("COMPLETED".equals(t.status)&&"PENDING".equals(t.handoverStatus));
        Checks.require(p.doctorId!=null&&Objects.equals(p.doctorId,t.doctorId),"Current hospital doctor required");patientService.validateClinician(p.doctorId);
        Checks.require(Checks.text(req.feedback())&&Checks.text(req.evidence()),"Record actual doctor feedback and its evidence");
        Checks.require(req.acknowledgedAt()!=null&&!req.acknowledgedAt().isAfter(LocalDateTime.now())&&!req.acknowledgedAt().isBefore(t.completedAt.minusSeconds(2)),"Enter actual hospital acknowledgement time");
        CareTask patch=new CareTask();patch.handoverStatus="ACKNOWLEDGED";patch.doctorFeedback=req.feedback();patch.acknowledgedAt=req.acknowledgedAt();patch.handoverChannel=req.channel();patch.handoverEvidence=req.evidence().trim();
        return view(writer.save(t,patch,"HOSPITAL_ACKNOWLEDGEMENT_EVIDENCE_RECORDED"),p);
    }
    private ContactAttempt attemptBase(CareTask task,LocalDateTime time,String method,String result,String evidence) {
        ContactAttempt row=new ContactAttempt();row.hospitalId=task.hospitalId;row.patientId=task.patientId;row.taskId=task.id;row.actorId=CurrentAccount.get().userId();
        row.contactAt=time;row.method=method;row.result=result;row.identityVerified=false;row.reportReviewed=false;row.evidence=evidence;
        row.requestKey="contact-"+task.id+"-"+task.version;row.creator=row.actorId.toString();return row;
    }
    private static ContactAttemptResponse attemptView(ContactAttempt a) {
        return new ContactAttemptResponse(a.id,a.actorId,a.contactAt,a.method,a.result,a.identityVerified,a.reportReviewed,a.recipientRole,a.reason,a.nextContactAt,a.nextPlan,a.medicationFeedback,a.patientQuestions,a.evidence);
    }
    private CareTask load(Long id,Integer version) {
        access.staff();CareTask t=tasks.selectByPrimaryKey(id);Checks.found(t!=null&&CurrentAccount.get().hospitalId().equals(t.hospitalId));access.require(t.patientId);
        Checks.conflict(version.equals(t.version));return t;
    }
    private KnowledgeEntry publishedReference(Long id,Long hospitalId) {
        KnowledgeEntry k=knowledge.selectByPrimaryKey(id);Checks.require(k!=null&&hospitalId.equals(k.hospitalId)&&"EDUCATION".equals(k.kind)&&"PUBLISHED".equals(k.status),"Choose doctor-reviewed education or leave the reference empty / 请选择医生已审核的宣教，或不选参考资料");return k;
    }
    private String template(KnowledgeEntry reference,CareRecord record) {
        StringBuilder content=new StringBuilder("您好，我们是健康管理团队。请先确认您是本人或授权联系人，现在是否方便沟通？\n请问近期身体感受如何，执行原医嘱时是否遇到困难，有哪些需要医生解答的问题？\n请核对原记录中的复诊安排与资料准备。\n");
        if(reference!=null)content.append("\n可选宣教参考：").append(reference.content);
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
        return new TaskResponse(t.id,t.patientId,name,t.taskType,t.title,t.priority,t.status,t.assigneeId,t.doctorId,t.dueAt,t.recordId,t.sopId==null||t.sopId==0?null:t.sopId,t.draftText,t.draftOrigin,t.approvedText,t.reviewNote,t.reviewerId,t.reviewedAt,t.reviewChannel,t.reviewEvidence,t.completedAt,t.outcome,t.evidence,t.version,!TERMINAL.contains(t.status)&&t.dueAt.isBefore(LocalDateTime.now()),t.followupStage,FAILED_CONTACT.contains(t.contactResult==null?"":t.contactResult)&&!TERMINAL.contains(t.status)?t.nextContactAt:null,
            t.contactResult,t.identityVerified,t.handoverStatus,t.doctorFeedback,t.handoverChannel,t.handoverEvidence,t.acknowledgedAt);
    }
}
