package com.bgssai.health.admin;

import com.bgssai.health.auth.dto.AccountInfo;
import com.bgssai.health.auth.service.CurrentAccount;
import com.bgssai.health.common.exception.BizException;
import com.bgssai.health.knowledge.dto.*;
import com.bgssai.health.knowledge.service.KnowledgeService;
import com.bgssai.health.mapper.*;
import com.bgssai.health.model.*;
import com.bgssai.health.patient.dto.*;
import com.bgssai.health.patient.service.PatientService;
import com.bgssai.health.record.dto.CreateRecordRequest;
import com.bgssai.health.record.service.RecordService;
import com.bgssai.health.report.dto.WeeklyReportRequest;
import com.bgssai.health.report.service.ReportService;
import com.bgssai.health.task.dto.*;
import com.bgssai.health.task.service.TaskService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties={
    "spring.datasource.url=jdbc:h2:mem:health-workflows;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "logging.level.root=WARN"
})
@Transactional
class HealthWorkflowTest {
    @Autowired TaskService tasks;
    @Autowired PatientService patients;
    @Autowired RecordService records;
    @Autowired KnowledgeService knowledge;
    @Autowired ReportService reports;
    @Autowired CareTaskMapper taskMapper;
    @Autowired CareMessageMapper messageMapper;
    @Autowired AuditEventMapper auditMapper;

    @BeforeEach void setup() { actor(1L,"MANAGER"); }
    @AfterEach void cleanup() { CurrentAccount.clear(); }
    private void actor(Long id,String role) { CurrentAccount.set(new AccountInfo(id,"Test actor",role,1L)); }
    private TaskResponse create(String type) {
        return tasks.create(new CreateTaskRequest(1001L,type,"Test "+type,"P1",
            LocalDateTime.now().plusDays(1).withNano(0),null,null,UUID.randomUUID().toString()));
    }
    private TaskResponse awaitingReview() {
        TaskResponse row=create("FOLLOWUP");
        row=tasks.claim(new ClaimTaskRequest(row.id(),row.version()));
        row=tasks.draft(new DraftTaskRequest(row.id(),row.version(),null,"TEMPLATE",null));
        return tasks.submit(new SubmitReviewRequest(row.id(),row.version()));
    }
    private RecordContactRequest contactRequest(TaskResponse row,String evidence) {
        return new RecordContactRequest(row.id(),row.version(),evidence,LocalDateTime.now().minusSeconds(1),"PHONE",true,"PATIENT",true,"按原医嘱执行，未调整用药","暂无补充问题");
    }
    private TaskResponse approved() {
        TaskResponse row=awaitingReview();
        return tasks.review(review(row,true,"请核对原医嘱并记录需要医生解答的问题。","已核对"));
    }
    private ReviewTaskRequest review(TaskResponse row,boolean approved,String text,String note) {
        return new ReviewTaskRequest(row.id(),row.version(),approved,text,note,"HOSPITAL_SYSTEM","虚构院方审核回执 TEST-REVIEW",LocalDateTime.now());
    }
    private PublishKnowledgeRequest publish(Long id,Integer version) {
        return new PublishKnowledgeRequest(id,version,2L,"SIGNED_DOCUMENT","虚构院方内容审核凭证 TEST-KNOWLEDGE",LocalDateTime.now());
    }
    private void rejects(String code,org.junit.jupiter.api.function.Executable action) {
        assertEquals(code,assertThrows(BizException.class,action).getCode());
    }
    @Test void operatorScopedPaginationAndMaskedList() {
        actor(3L,"OPERATOR");
        var page=patients.query(new PatientQueryRequest(0,1,null,null,null));
        assertEquals(1,page.items().size());assertTrue(page.totalSize()>1);
        assertTrue(page.items().getFirst().name().contains("*"));
        assertNull(page.items().getFirst().note());
        rejects("404000",()->patients.detail(10005L));
    }
    @Test void approvalRequiresExternalHospitalEvidence() {
        TaskResponse row=awaitingReview();
        rejects("50000001",()->tasks.review(new ReviewTaskRequest(row.id(),row.version(),true,"x",null,"PHONE","",LocalDateTime.now())));
    }
    @Test void anotherOperatorCannotReadOrRecordReview() {
        TaskResponse row=awaitingReview();actor(20L,"OPERATOR");
        rejects("404000",()->tasks.context(row.id()));
        rejects("404000",()->tasks.review(review(row,true,"x",null)));
    }
    @Test void platformAccountCannotReadPatientsOrDashboard() {
        actor(4L,"PLATFORM_ADMIN");
        rejects("4003",()->patients.query(new PatientQueryRequest(0,10,null,null,null)));
        rejects("4003",reports::dashboard);
    }
    @Test void hospitalBoundaryAppliesToReadsAndWrites() {
        CurrentAccount.set(new AccountInfo(999L,"Other hospital","MANAGER",2L));
        assertEquals(0,patients.query(new PatientQueryRequest(0,10,null,null,null)).totalSize());
        rejects("404000",()->patients.detail(1001L));
        rejects("404000",()->tasks.create(new CreateTaskRequest(1001L,"FOLLOWUP","No","P2",LocalDateTime.now(),null,null,"other-hospital")));
    }
    @Test void staleClaimCannotOverwriteTask() {
        TaskResponse row=create("FOLLOWUP");
        tasks.claim(new ClaimTaskRequest(row.id(),row.version()));
        rejects("409000",()->tasks.claim(new ClaimTaskRequest(row.id(),row.version())));
    }
    @Test void completeAdviceLifecycleWithManualEvidenceAndAudit() {
        TaskResponse row=approved();actor(3L,"OPERATOR");
        row=tasks.contact(contactRequest(row,"2026-09-28 电话核对本人，按批准内容联系并记录。"));
        assertEquals("CONTACTED",row.status());assertNotNull(row.evidence());
        CareMessageExample messages=new CareMessageExample();messages.eq("task_id",row.id());
        assertEquals(1,messageMapper.countByExample(messages));
        row=tasks.transition(new TransitionTaskRequest(row.id(),row.version(),"COMPLETE","已确认情况并记录后续计划。",null));
        assertEquals("COMPLETED",row.status());assertNotNull(row.completedAt());
        AuditEventExample audits=new AuditEventExample();audits.eq("resource_id",row.id()).eq("action","MANUAL_CONTACT_RECORDED");
        assertEquals(1,auditMapper.countByExample(audits));
        assertTrue(row.evidence().contains("电话"));
    }
    @Test void duplicateContactIsRejectedAndDoesNotDuplicateCommunication() {
        TaskResponse row=approved();
        tasks.contact(contactRequest(row,"当面联系并核实"));
        rejects("409000",()->tasks.contact(contactRequest(row,"重复")));
        CareMessageExample ex=new CareMessageExample();ex.eq("task_id",row.id());
        assertEquals(1,messageMapper.countByExample(ex));
    }
    @Test void manualContactRequiresEvidenceAndReview() {
        TaskResponse row=approved();
        rejects("50000001",()->tasks.contact(contactRequest(row," ")));
    }
    @Test void doctorReassignmentInvalidatesOldApprovalAndVersion() {
        TaskResponse row=approved();actor(1L,"MANAGER");
        PatientResponse patient=patients.detail(1001L);
        patients.update(new UpdatePatientRequest(patient.id(),patient.version(),5L,3L,null,null,null,null,null));
        CareTask changed=taskMapper.selectByPrimaryKey(row.id());
        assertEquals("IN_PROGRESS",changed.status);assertEquals("",changed.approvedText);
        assertTrue(changed.version>row.version());assertEquals(5L,changed.doctorId);
        rejects("409000",()->tasks.contact(contactRequest(row,"过期页面")));
        actor(20L,"OPERATOR");rejects("404000",()->tasks.context(row.id()));
    }
    @Test void publishedKnowledgeEditsDoNotChangeExistingDraftSnapshot() {
        var entry=knowledge.save(new SaveKnowledgeRequest(null,"Education","EDUCATION","全科","Original education","Test source",null,null,null));
        knowledge.publish(publish(entry.id(),entry.version()));
        TaskResponse row=create("FOLLOWUP");row=tasks.claim(new ClaimTaskRequest(row.id(),row.version()));
        row=tasks.draft(new DraftTaskRequest(row.id(),row.version(),entry.id(),"TEMPLATE",null));String snapshot=row.draftText();
        knowledge.save(new SaveKnowledgeRequest(entry.id(),"Updated","EDUCATION","全科","New content","Test source",entry.version(),null,null));
        assertEquals(snapshot,tasks.context(row.id()).task().draftText());
        TaskResponse saved=row;
        rejects("50000001",()->tasks.draft(new DraftTaskRequest(saved.id(),saved.version(),entry.id(),"TEMPLATE",null)));
    }
    @Test void sopIsNotAProductContentTypeAndDraftNeedsNoPublishedSop() {
        rejects("50000001",()->knowledge.save(new SaveKnowledgeRequest(null,"SOP","SOP","全科","Process","Operations",null,null,null)));
        var entry=knowledge.save(new SaveKnowledgeRequest(null,"Education","EDUCATION","全科","Service information","Test source",null,null,null));
        rejects("50000001",()->knowledge.save(new SaveKnowledgeRequest(entry.id(),"Changed","PACKAGE","全科","Content","Source",entry.version(),30,3)));
        assertEquals("PENDING_REVIEW",awaitingReview().status());
    }
    @Test void managerRecordsHospitalContentReviewAndOperatorCannotPublish() {
        var education=knowledge.save(new SaveKnowledgeRequest(null,"Education","EDUCATION","全科","Service information","Test source",null,null,null));
        actor(3L,"OPERATOR");rejects("4003",()->knowledge.publish(publish(education.id(),education.version())));
        actor(1L,"MANAGER");assertEquals("PUBLISHED",knowledge.publish(publish(education.id(),education.version())).status());
    }
    @Test void dischargeDraftUsesItsOwnReportAndDoesNotInventMissingFields() {
        var record=records.create(new CreateRecordRequest(1001L,"DISCHARGE",LocalDateTime.now().minusDays(1),"Original report",14,LocalDate.of(2026,10,3)));
        records.create(new CreateRecordRequest(1001L,"DISCHARGE",LocalDateTime.now().minusHours(1),"Later report",99,LocalDate.of(2026,12,12)));
        var task=tasks.query(new TaskQueryRequest(0,100,1001L,"FOLLOWUP",null,null,false)).items().stream().filter(x->record.id().equals(x.recordId())).findFirst().orElseThrow();
        task=tasks.claim(new ClaimTaskRequest(task.id(),task.version()));
        var draft=tasks.draft(new DraftTaskRequest(task.id(),task.version(),null,"TEMPLATE",null));
        assertTrue(draft.draftText().contains("14 天"));assertTrue(draft.draftText().contains("2026-10-03"));assertFalse(draft.draftText().contains("99 天"));
        assertEquals(record.id(),tasks.context(draft.id()).record().id());
        TaskResponse noRecord=create("FOLLOWUP");noRecord=tasks.claim(new ClaimTaskRequest(noRecord.id(),noRecord.version()));
        var generic=tasks.draft(new DraftTaskRequest(noRecord.id(),noRecord.version(),null,"TEMPLATE",null));
        assertFalse(generic.draftText().contains("14 天"));assertFalse(generic.draftText().contains("2026-10-03"));
    }
    @Test void rejectedDraftNeedsNewSubmissionBeforeApproval() {
        TaskResponse row=awaitingReview();
        row=tasks.review(review(row,false,null,"需要重新核对原记录"));
        assertEquals("REJECTED",row.status());
        row=tasks.draft(new DraftTaskRequest(row.id(),row.version(),null,"MANUAL","重新核对后的问询内容"));
        assertEquals("IN_PROGRESS",row.status());
        assertEquals("",row.approvedText());
    }
    @Test void alertClosureRequiresRecordedHospitalDisposition() {
        TaskResponse row=create("ALERT");
        row=tasks.claim(new ClaimTaskRequest(row.id(),row.version()));
        row=tasks.transition(new TransitionTaskRequest(row.id(),row.version(),"ESCALATE",null,null));
        TaskResponse escalated=row;
        rejects("50000001",()->tasks.transition(new TransitionTaskRequest(escalated.id(),escalated.version(),"COMPLETE","已核实",null)));
        rejects("50000001",()->tasks.transition(new TransitionTaskRequest(escalated.id(),escalated.version(),"COMPLETE","院方确认后记录处置结果","虚构院方处置凭证 TEST-ALERT")));
        assertEquals("COMPLETED",tasks.transition(new TransitionTaskRequest(row.id(),row.version(),"COMPLETE","院方确认后记录处置结果","虚构院方处置凭证 TEST-ALERT","OUTPATIENT")).status());
    }
    @Test void arrivalRequiresEvidenceAndCompletionRequiresOutcome() {
        TaskResponse row=create("REVISIT");
        row=tasks.transition(new TransitionTaskRequest(row.id(),row.version(),"BOOK",null,"预约门诊，已核对时间"));
        TaskResponse booked=row;
        rejects("50000001",()->tasks.transition(new TransitionTaskRequest(booked.id(),booked.version(),"ARRIVE",null,"")));
        row=tasks.transition(new TransitionTaskRequest(row.id(),row.version(),"ARRIVE",null,"人工核对当日就诊单编号 TEST-1"));
        row=tasks.transition(new TransitionTaskRequest(row.id(),row.version(),"COMPLETE","就诊完成，结果已记录",null));
        assertEquals("COMPLETED",row.status());assertTrue(row.evidence().contains("TEST-1"));
    }
    @Test void recordCreatesLinkedFollowupAndRevisitWithOriginalContext() {
        var row=records.create(new CreateRecordRequest(1001L,"DISCHARGE",LocalDateTime.now().minusHours(1),"Original discharge record",30,LocalDate.now().plusDays(7)));
        var list=tasks.query(new TaskQueryRequest(0,100,1001L,null,null,null,false));
        var related=list.items().stream().filter(x->row.id().equals(x.recordId())).toList();
        assertEquals(2,related.size());
        assertEquals(row.id(),tasks.context(related.getFirst().id()).record().id());
    }
    @Test void idempotencyKeyCannotBeReusedForDifferentPatient() {
        String key=UUID.randomUUID().toString();LocalDateTime due=LocalDateTime.now().plusDays(1).withNano(0);
        var request=new CreateTaskRequest(1001L,"FOLLOWUP","Same request","P2",due,null,null,key);
        var first=tasks.create(request);assertEquals(first.id(),tasks.create(request).id());
        rejects("409000",()->tasks.create(new CreateTaskRequest(1002L,"FOLLOWUP","Same request","P2",due,null,null,key)));
    }
    @Test void zeroDenominatorIsNotPresentedAsSuccess() {
        var report=reports.weekly(new WeeklyReportRequest(LocalDate.of(2000,1,1),LocalDate.of(2000,1,7)));
        assertEquals(0,report.dueCount());assertNull(report.completionRate());assertNull(report.arrivalRate());assertEquals("NOT_SENT",report.deliveryStatus());
    }
    @Test void exampleSqlIdentifiersAreWhitelisted() {
        PatientExample ex=new PatientExample();
        assertThrows(IllegalArgumentException.class,()->ex.eq("id OR 1=1",1));
        assertThrows(IllegalArgumentException.class,()->ex.setOrderByClause("id DESC; DROP TABLE patient"));
        assertThrows(IllegalArgumentException.class,()->ex.selectColumns("password"));
    }
}
