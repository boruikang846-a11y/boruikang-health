package com.boruikang.health.admin;

import com.boruikang.health.auth.dto.AccountInfo;
import com.boruikang.health.auth.service.CurrentAccount;
import com.boruikang.health.common.exception.BizException;
import com.boruikang.health.integration.dto.SaveIntegrationRequest;
import com.boruikang.health.integration.service.IntegrationService;
import com.boruikang.health.knowledge.dto.*;
import com.boruikang.health.knowledge.service.KnowledgeService;
import com.boruikang.health.mapper.*;
import com.boruikang.health.model.*;
import com.boruikang.health.patient.dto.*;
import com.boruikang.health.patient.service.PatientService;
import com.boruikang.health.record.dto.CreateRecordRequest;
import com.boruikang.health.record.dto.ReportQueryRequest;
import com.boruikang.health.record.dto.ReviewRecordRequest;
import com.boruikang.health.record.dto.RecordQueryRequest;
import com.boruikang.health.record.service.RecordService;
import com.boruikang.health.report.dto.WeeklyReportRequest;
import com.boruikang.health.report.service.ReportService;
import com.boruikang.health.task.dto.*;
import com.boruikang.health.task.service.TaskService;
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
    @Autowired IntegrationService integrations;
    @Autowired IntegrationConfigMapper integrationMapper;
    @Autowired PatientService patients;
    @Autowired RecordService records;
    @Autowired KnowledgeService knowledge;
    @Autowired ReportService reports;
    @Autowired CareTaskMapper taskMapper;
    @Autowired CareMessageMapper messageMapper;
    @Autowired AuditEventMapper auditMapper;
    @Autowired CareRecordMapper recordMapper;

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
        return asDoctor(()->tasks.review(review(row,true,"请核对原医嘱并记录需要医生解答的问题。","已核对")));
    }
    /** Patient 1001's responsible doctor is the seeded doctor account 2; the caller is restored to the manager afterwards. */
    private <T> T asDoctor(java.util.function.Supplier<T> action) {
        actor(2L,"DOCTOR");
        try { return action.get(); } finally { actor(1L,"MANAGER"); }
    }
    private ReviewTaskRequest review(TaskResponse row,boolean approved,String text,String note) {
        return new ReviewTaskRequest(row.id(),row.version(),approved,text,note);
    }
    private KnowledgeResponse publish(Long id,Integer version) {
        return asDoctor(()->knowledge.publish(new PublishKnowledgeRequest(id,version)));
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
    @Test void onlyTheResponsibleDoctorReviewsAdvice() {
        TaskResponse row=awaitingReview();
        rejects("4003",()->tasks.review(review(row,true,"运营代审核",null)));
        actor(3L,"OPERATOR");rejects("4003",()->tasks.review(review(row,true,"运营代审核",null)));
        actor(5L,"DOCTOR");rejects("404000",()->tasks.review(review(row,true,"非责任医生",null)));
        actor(2L,"DOCTOR");rejects("50000001",()->tasks.review(review(row,true," ",null)));
        rejects("50000001",()->tasks.review(review(row,false,null," ")));
        TaskResponse approved=tasks.review(review(row,true,"医生修改后的正文","已核对原报告"));
        assertEquals("APPROVED",approved.status());assertEquals("医生修改后的正文",approved.approvedText());
        assertEquals(2L,approved.reviewerId());assertNotNull(approved.reviewedAt());
        AuditEventExample audits=new AuditEventExample();audits.eq("resource_id",row.id()).eq("action","DOCTOR_APPROVED").eq("actor_id",2L);
        assertEquals(1,auditMapper.countByExample(audits));
    }
    @Test void anotherOperatorCannotReadOrRecordReview() {
        TaskResponse row=awaitingReview();actor(20L,"OPERATOR");
        rejects("404000",()->tasks.context(row.id()));
        rejects("4003",()->tasks.review(review(row,true,"x",null)));
    }
    @Test void doctorSeesOwnPatientsReadOnly() {
        actor(2L,"DOCTOR");
        var page=patients.query(new PatientQueryRequest(0,100,null,null,null));
        assertTrue(page.totalSize()>0);assertTrue(page.items().stream().allMatch(p->Long.valueOf(2L).equals(p.doctorId())));
        rejects("404000",()->patients.detail(1002L));
        assertEquals(1001L,patients.detail(1001L).id());
        rejects("4003",()->tasks.create(new CreateTaskRequest(1001L,"FOLLOWUP","医生不建任务","P2",LocalDateTime.now().plusDays(1),null,null,UUID.randomUUID().toString())));
        rejects("4003",()->records.create(new CreateRecordRequest(1001L,"OUTPATIENT",LocalDateTime.now(),"医生不录入",null,null)));
        rejects("4003",()->patients.update(new UpdatePatientRequest(1001L,0,null,null,"PAUSED",null,null,null,null)));
        assertTrue(tasks.query(new TaskQueryRequest(0,100,null,null,"PENDING_REVIEW",null,false)).items().stream().allMatch(t->Long.valueOf(2L).equals(t.doctorId())));
    }
    @Test void nurseWorksOnAssignedPatientsButCannotReview() {
        actor(6L,"NURSE");
        var page=patients.query(new PatientQueryRequest(0,100,null,null,null));
        assertTrue(page.totalSize()>0);assertTrue(page.items().stream().allMatch(p->Long.valueOf(6L).equals(p.ownerId())));
        rejects("404000",()->patients.detail(1001L));
        Long patientId=page.items().getFirst().id();
        TaskResponse row=tasks.create(new CreateTaskRequest(patientId,"FOLLOWUP","护士随访","P2",LocalDateTime.now().plusDays(1).withNano(0),null,null,UUID.randomUUID().toString()));
        assertEquals(6L,row.assigneeId());
        row=tasks.claim(new ClaimTaskRequest(row.id(),row.version()));
        row=tasks.draft(new DraftTaskRequest(row.id(),row.version(),null,"MANUAL","护士起草的随访意见"));
        row=tasks.submit(new SubmitReviewRequest(row.id(),row.version()));
        assertEquals("PENDING_REVIEW",row.status());
        TaskResponse pending=row;
        rejects("4003",()->tasks.review(review(pending,true,"护士不能审核",null)));
    }
    @Test void doctorConfirmsReportsAndTeamSeesTheOpinion() {
        var record=records.create(new CreateRecordRequest(1001L,"DISCHARGE",LocalDateTime.now().minusHours(3),"待医生查看的出院报告",14,null));
        actor(2L,"DOCTOR");
        var unread=records.reports(new ReportQueryRequest(0,100,false,null,null));
        assertTrue(unread.items().stream().anyMatch(r->r.id().equals(record.id())));
        rejects("50000001",()->records.review(new ReviewRecordRequest(2L,"体征记录不是报告")));
        var viewed=records.review(new ReviewRecordRequest(record.id(),"随访时重点核对服药与复诊安排"));
        assertNotNull(viewed.doctorViewedAt());assertEquals(2L,viewed.doctorViewerId());
        assertFalse(records.reports(new ReportQueryRequest(0,100,false,null,null)).items().stream().anyMatch(r->r.id().equals(record.id())));
        rejects("50000001",()->records.review(new ReviewRecordRequest(record.id()," ")));
        assertEquals("更新后的意见",records.review(new ReviewRecordRequest(record.id(),"更新后的意见")).doctorOpinion());
        assertEquals(viewed.doctorViewedAt(),recordMapper.selectByPrimaryKey(record.id()).doctorViewedAt);
        actor(5L,"DOCTOR");rejects("404000",()->records.review(new ReviewRecordRequest(record.id(),"非责任医生")));
        actor(3L,"OPERATOR");rejects("4003",()->records.reports(new ReportQueryRequest(0,10,null,null,null)));
        var seen=records.query(new RecordQueryRequest(0,100,1001L,"DISCHARGE")).items().stream().filter(r->r.id().equals(record.id())).findFirst().orElseThrow();
        assertEquals("更新后的意见",seen.doctorOpinion());assertNotNull(seen.doctorViewedAt());
    }
    @Test void reviewingAdviceMarksItsReportAsRead() {
        var record=records.create(new CreateRecordRequest(1001L,"DISCHARGE",LocalDateTime.now().minusHours(2),"审核时一并阅读的报告",null,null));
        TaskResponse row=tasks.create(new CreateTaskRequest(1001L,"FOLLOWUP","按报告随访","P2",LocalDateTime.now().plusDays(1).withNano(0),record.id(),null,UUID.randomUUID().toString()));
        row=tasks.claim(new ClaimTaskRequest(row.id(),row.version()));
        row=tasks.draft(new DraftTaskRequest(row.id(),row.version(),null,"TEMPLATE",null));
        TaskResponse submitted=tasks.submit(new SubmitReviewRequest(row.id(),row.version()));
        assertNull(recordMapper.selectByPrimaryKey(record.id()).doctorViewedAt);
        asDoctor(()->tasks.review(review(submitted,true,"按报告核对","已阅")));
        CareRecord read=recordMapper.selectByPrimaryKey(record.id());
        assertNotNull(read.doctorViewedAt);assertEquals(2L,read.doctorViewerId);
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
        publish(entry.id(),entry.version());
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
    @Test void doctorPublishesEducationAndOperationsCannot() {
        var education=knowledge.save(new SaveKnowledgeRequest(null,"Education","EDUCATION","全科","Service information","Test source",null,null,null));
        rejects("4003",()->knowledge.publish(new PublishKnowledgeRequest(education.id(),education.version())));
        actor(3L,"OPERATOR");rejects("4003",()->knowledge.publish(new PublishKnowledgeRequest(education.id(),education.version())));
        actor(1L,"MANAGER");var published=publish(education.id(),education.version());
        assertEquals("PUBLISHED",published.status());assertEquals(2L,published.reviewerId());assertNotNull(published.reviewedAt());
    }
    @Test void aiFollowupDraftRequiresLinkedRecordTextAndDoesNotCallOutWithoutIt() {
        integrations.save(new SaveIntegrationRequest("AI",IntegrationService.DEEPSEEK,"deepseek-flash","sk-test",true));
        TaskResponse row=create("FOLLOWUP");row=tasks.claim(new ClaimTaskRequest(row.id(),row.version()));
        TaskResponse claimed=row;
        BizException ex=assertThrows(BizException.class,()->tasks.draft(new DraftTaskRequest(claimed.id(),claimed.version(),null,"AI",null)));
        assertEquals("50000001",ex.getCode());assertTrue(ex.getMessage().contains("病历"));
        TaskResponse unchanged=tasks.context(claimed.id()).task();
        assertEquals("IN_PROGRESS",unchanged.status());assertTrue(unchanged.draftText()==null||unchanged.draftText().isBlank());
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
        TaskResponse submitted=row;
        row=asDoctor(()->tasks.review(review(submitted,false,null,"需要重新核对原记录")));
        assertEquals("REJECTED",row.status());
        row=tasks.draft(new DraftTaskRequest(row.id(),row.version(),null,"MANUAL","重新核对后的问询内容"));
        assertEquals("IN_PROGRESS",row.status());
        assertEquals("",row.approvedText());
    }
    @Test void onlyTheResponsibleDoctorClosesEscalatedClinicalAlerts() {
        TaskResponse row=create("ALERT");
        row=tasks.claim(new ClaimTaskRequest(row.id(),row.version()));
        TaskResponse claimed=row;
        rejects("50000001",()->tasks.transition(new TransitionTaskRequest(claimed.id(),claimed.version(),"COMPLETE","运营不能关闭临床异常","凭证","OUTPATIENT")));
        row=tasks.transition(new TransitionTaskRequest(row.id(),row.version(),"ESCALATE",null,null));
        TaskResponse escalated=row;
        rejects("50000001",()->tasks.transition(new TransitionTaskRequest(escalated.id(),escalated.version(),"COMPLETE","运营代登记处置","虚构凭证","OUTPATIENT")));
        actor(5L,"DOCTOR");rejects("404000",()->tasks.transition(new TransitionTaskRequest(escalated.id(),escalated.version(),"COMPLETE","非责任医生",null,"OBSERVE")));
        actor(2L,"DOCTOR");
        rejects("4003",()->tasks.transition(new TransitionTaskRequest(escalated.id(),escalated.version(),"ESCALATE",null,null)));
        rejects("50000001",()->tasks.transition(new TransitionTaskRequest(escalated.id(),escalated.version(),"COMPLETE","缺少去向",null)));
        TaskResponse closed=tasks.transition(new TransitionTaskRequest(escalated.id(),escalated.version(),"COMPLETE","已电话指导门诊复查",null,"OUTPATIENT"));
        assertEquals("COMPLETED",closed.status());assertEquals("OUTPATIENT",closed.disposition());
    }
    @Test void lostContactAlertIsClosedByTheTeamWithoutTheDoctor() {
        TaskResponse row=tasks.create(new CreateTaskRequest(1001L,"ALERT","连续未联系上","P1",LocalDateTime.now().plusDays(1).withNano(0),null,null,UUID.randomUUID().toString(),"LOST_CONTACT"));
        TaskResponse lost=row;
        rejects("50000001",()->tasks.transition(new TransitionTaskRequest(lost.id(),lost.version(),"COMPLETE","已联系上家属",null)));
        assertEquals("COMPLETED",tasks.transition(new TransitionTaskRequest(lost.id(),lost.version(),"COMPLETE","已联系上家属","家属电话确认患者外出，约定下周复联")).status());
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
    @Test void onlyManagersAndPlatformAdminsCanConfigureDeepseek() {
        var request=new SaveIntegrationRequest("AI",IntegrationService.DEEPSEEK,"deepseek-flash","test-deepseek-key",true);
        for(String role:java.util.List.of("DOCTOR","NURSE","OPERATOR")) {
            actor(3L,role);rejects("4003",()->integrations.save(request));
        }
        for(String role:java.util.List.of("MANAGER","PLATFORM_ADMIN")) {
            actor(1L,role);assertTrue(integrations.save(request).configured());
        }
    }
    @Test void previousProviderRequiresANewDeepseekKey() {
        IntegrationConfig old=integrations.aiConfig();old.endpoint="https://dev.legacy-ai.example.com/v1/chat/completions";old.modelName="legacy-model";old.secret="legacy-key";old.enabled=true;
        IntegrationConfigExample ex=new IntegrationConfigExample();ex.eq("id",old.id);
        integrationMapper.updateByExampleSelective(old,ex);
        var listed=integrations.list().getFirst();
        assertEquals(IntegrationService.DEEPSEEK,listed.endpoint());assertEquals("deepseek-flash",listed.modelName());
        assertFalse(listed.enabled());assertFalse(listed.configured());assertEquals("NOT_CONFIGURED",listed.status());
        assertEquals(old.endpoint,integrations.aiConfig().endpoint);
        assertThrows(BizException.class,()->integrations.save(new SaveIntegrationRequest("AI",IntegrationService.DEEPSEEK,"deepseek-flash","",true)));
        assertEquals("legacy-key",integrations.aiConfig().secret);
        var saved=integrations.save(new SaveIntegrationRequest("AI",IntegrationService.DEEPSEEK,"deepseek-flash","new-deepseek-key",true));
        assertTrue(saved.configured());assertTrue(saved.enabled());assertEquals("new-deepseek-key",integrations.aiConfig().secret);
        integrations.save(new SaveIntegrationRequest("AI",IntegrationService.DEEPSEEK,"deepseek-v4-pro","",true));
        assertEquals("new-deepseek-key",integrations.aiConfig().secret);
    }
    @Test void savingDisabledDeepseekDoesNotRetainOtherProviderKey() {
        IntegrationConfig old=integrations.aiConfig();old.endpoint="https://www.legacy-ai.example.com/v1/chat/completions";old.secret="legacy-key";old.enabled=true;
        IntegrationConfigExample ex=new IntegrationConfigExample();ex.eq("id",old.id);
        integrationMapper.updateByExampleSelective(old,ex);
        var saved=integrations.save(new SaveIntegrationRequest("AI",IntegrationService.DEEPSEEK,"deepseek-flash","",false));
        assertFalse(saved.configured());assertFalse(saved.enabled());assertEquals("",integrations.aiConfig().secret);
        assertThrows(BizException.class,()->integrations.save(new SaveIntegrationRequest("AI",IntegrationService.DEEPSEEK,"deepseek-flash","",true)));
    }

}
