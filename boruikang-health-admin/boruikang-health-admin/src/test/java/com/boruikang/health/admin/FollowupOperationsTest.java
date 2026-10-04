package com.boruikang.health.admin;

import com.boruikang.health.auth.dto.AccountInfo;
import com.boruikang.health.auth.service.CurrentAccount;
import com.boruikang.health.common.dto.PageRequest;
import com.boruikang.health.common.exception.BizException;
import com.boruikang.health.mapper.CareTaskMapper;
import com.boruikang.health.model.CareTask;
import com.boruikang.health.record.dto.CreateRecordRequest;
import com.boruikang.health.record.service.RecordService;
import com.boruikang.health.report.dto.*;
import com.boruikang.health.report.service.ReportService;
import com.boruikang.health.task.dto.*;
import com.boruikang.health.task.service.TaskService;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:followup-operations;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1","logging.level.root=WARN"})
@Transactional
class FollowupOperationsTest {
    @Autowired TaskService tasks;
    @Autowired RecordService records;
    @Autowired ReportService reports;
    @Autowired CareTaskMapper taskMapper;
    @BeforeEach void setup(){actor(1L,"MANAGER");}
    @AfterEach void cleanup(){CurrentAccount.clear();}
    private void actor(Long id,String role){CurrentAccount.set(new AccountInfo(id,"Test",role,1L));}
    private TaskResponse create(String type){return tasks.create(new CreateTaskRequest(1001L,type,"Operations test","P2",LocalDateTime.now().withNano(0),null,null,UUID.randomUUID().toString()));}
    private RecordAttemptRequest attempt(TaskResponse task){return new RecordAttemptRequest(task.id(),task.version(),LocalDateTime.now().minusMinutes(1),"PHONE","NO_ANSWER","无人接听",LocalDateTime.now().plusHours(2),"按约定时间再次联系","虚构电话记录 TEST-CALL");}
    private TaskResponse approve(TaskResponse row){
        row=tasks.claim(new ClaimTaskRequest(row.id(),row.version()));
        row=tasks.draft(new DraftTaskRequest(row.id(),row.version(),null,"TEMPLATE",null));
        row=tasks.submit(new SubmitReviewRequest(row.id(),row.version()));
        var submitted=row;actor(2L,"DOCTOR");
        try { return tasks.review(new ReviewTaskRequest(submitted.id(),submitted.version(),true,"仅核对原报告与问题，不调整用药。","已核对")); } finally { actor(1L,"MANAGER"); }
    }
    private RecordContactRequest contact(TaskResponse row,boolean identity,boolean report){return new RecordContactRequest(row.id(),row.version(),"虚构电话记录 TEST-CONNECTED",LocalDateTime.now().minusSeconds(1),"PHONE",identity,"PATIENT",report,"无新增困难，按原医嘱执行","暂无问题");}
    private WeeklyReportResponse today(){return reports.weekly(new WeeklyReportRequest(LocalDate.now(),LocalDate.now()));}

    @Test void unsuccessfulCallRetainsDeadlineAndDoesNotCountAsCompleted(){
        var row=create("FOLLOWUP");var before=today();var saved=tasks.attempt(attempt(row));
        assertEquals(row.dueAt(),saved.dueAt());assertEquals("PENDING",saved.status());assertEquals("NO_ANSWER",saved.contactResult());assertNotNull(saved.nextContactAt());
        assertEquals(before.completedCount(),today().completedCount());assertEquals(before.dueCount(),today().dueCount());
        assertEquals(before.contactPendingCount()+1,today().contactPendingCount());
        assertThrows(BizException.class,()->tasks.attempt(attempt(row)));
        var history=tasks.context(row.id()).attempts();assertEquals(1,history.size());assertEquals("无人接听",history.getFirst().reason());
    }
    @Test void failedAttemptRequiresNextPlanAndRespectsDoctorAndHospitalScope(){
        var row=create("FOLLOWUP");
        assertThrows(BizException.class,()->tasks.attempt(new RecordAttemptRequest(row.id(),row.version(),LocalDateTime.now().minusMinutes(1),"PHONE","BUSY","占线",null,"","凭证")));
        assertTrue(tasks.context(row.id()).attempts().isEmpty());
        actor(20L,"OPERATOR");assertThrows(BizException.class,()->tasks.attempt(attempt(row)));
        CurrentAccount.set(new AccountInfo(99L,"Other","MANAGER",2L));assertThrows(BizException.class,()->tasks.context(row.id()));
    }
    @Test void completedRecordRequiresIdentityAndResponsibleDoctorAcknowledgement(){
        var record=records.create(new CreateRecordRequest(1001L,"DISCHARGE",LocalDateTime.now().minusDays(1),"Fictional report",null,null));
        var initial=tasks.create(new CreateTaskRequest(1001L,"FOLLOWUP","Review report","P2",LocalDateTime.now(),record.id(),null,UUID.randomUUID().toString()));
        var approved=approve(initial);
        assertThrows(BizException.class,()->tasks.contact(contact(approved,false,true)));
        assertThrows(BizException.class,()->tasks.contact(contact(approved,true,false)));
        assertTrue(tasks.context(initial.id()).attempts().isEmpty());
        actor(3L,"OPERATOR");var connected=tasks.contact(contact(approved,true,true));
        var done=tasks.transition(new TransitionTaskRequest(connected.id(),connected.version(),"COMPLETE","已记录反馈并交接",null));
        assertEquals("PENDING",done.handoverStatus());assertNull(done.nextContactAt());
        assertEquals("4003",assertThrows(BizException.class,()->tasks.acknowledge(new AcknowledgeTaskRequest(done.id(),done.version(),"运营不能代医生查收"))).getCode());
        actor(5L,"DOCTOR");assertEquals("404000",assertThrows(BizException.class,()->tasks.acknowledge(new AcknowledgeTaskRequest(done.id(),done.version(),"非责任医生"))).getCode());
        actor(2L,"DOCTOR");var received=tasks.acknowledge(new AcknowledgeTaskRequest(done.id(),done.version(),"已查收，按原计划跟进"));
        assertEquals("ACKNOWLEDGED",received.handoverStatus());assertNotNull(received.acknowledgedAt());assertEquals("已查收，按原计划跟进",received.doctorFeedback());
        assertThrows(BizException.class,()->tasks.acknowledge(new AcknowledgeTaskRequest(done.id(),done.version(),"重复")));
    }
    @Test void explicitNodeSchedulingIsIdempotentAndCannotReuseAnotherPatientsRecord(){
        var record=records.create(new CreateRecordRequest(1001L,"DISCHARGE",LocalDateTime.now().minusDays(2),"Fictional report",null,null));
        var nodes=List.of(new ScheduleFollowupsRequest.Node("D3","三日问询",LocalDateTime.now().plusDays(1).withNano(0)),new ScheduleFollowupsRequest.Node("D7","七日问询",LocalDateTime.now().plusDays(5).withNano(0)));
        String key=UUID.randomUUID().toString();var request=new ScheduleFollowupsRequest(1001L,record.id(),key,nodes);
        var first=tasks.schedule(request);assertEquals(first.stream().map(TaskResponse::id).toList(),tasks.schedule(request).stream().map(TaskResponse::id).toList());
        assertTrue(first.stream().allMatch(x->"PENDING".equals(x.status())&&x.approvedText()==null));
        assertThrows(BizException.class,()->tasks.schedule(new ScheduleFollowupsRequest(1002L,record.id(),UUID.randomUUID().toString(),nodes)));
        assertThrows(BizException.class,()->tasks.schedule(new ScheduleFollowupsRequest(1001L,record.id(),key,List.of(nodes.getFirst()))));
    }
    @Test void nursesSeeScopedRatesAndCancelledTasksDoNotInflateDenominator(){
        actor(3L,"OPERATOR");var before=today();var row=create("FOLLOWUP");tasks.attempt(attempt(row));
        var during=today();assertEquals(before.dueCount()+1,during.dueCount());assertEquals(before.completedCount(),during.completedCount());
        assertTrue(during.nurses().stream().allMatch(n->n.ownerId().equals(3L)));
        var latest=tasks.context(row.id()).task();tasks.transition(new TransitionTaskRequest(latest.id(),latest.version(),"CANCEL","错误重复安排",null));
        assertEquals(before.dueCount(),today().dueCount());
    }
    @Test void revisitPendingFilterExcludesVerifiedArrivals(){
        var row=create("REVISIT");var booked=tasks.transition(new TransitionTaskRequest(row.id(),row.version(),"BOOK",null,"虚构预约"));
        var request=new TaskQueryRequest(0,100,1001L,"REVISIT",null,null,false,null,null,null,LocalDate.now(),LocalDate.now(),true);
        assertTrue(tasks.query(request).items().stream().anyMatch(x->x.id().equals(row.id())));
        tasks.transition(new TransitionTaskRequest(booked.id(),booked.version(),"ARRIVE",null,"已核对虚构就诊记录 TEST-VISIT"));
        assertFalse(tasks.query(request).items().stream().anyMatch(x->x.id().equals(row.id())));
    }
    @Test void archiveIsImmutableScopedAndDeliveryRequiresRealEvidence(){
        actor(3L,"OPERATOR");var archive=reports.archive(new ArchiveReportRequest("DAILY",LocalDate.now(),LocalDate.now(),"当日记录","继续跟进"));
        assertFalse(archive.createdAt().isAfter(LocalDateTime.now()));
        long original=archive.snapshot().dueCount();create("FOLLOWUP");
        var persisted=reports.archives(new PageRequest(0,100)).items().stream().filter(x->x.id().equals(archive.id())).findFirst().orElseThrow();
        assertEquals(original,persisted.snapshot().dueCount());assertEquals(original+1,today().dueCount());
        actor(20L,"OPERATOR");assertTrue(reports.archives(new PageRequest(0,100)).items().isEmpty());
        assertThrows(BizException.class,()->reports.deliver(new DeliverReportRequest(archive.id(),archive.version(),"不可越权",LocalDateTime.now())));
        actor(3L,"OPERATOR");assertThrows(BizException.class,()->reports.deliver(new DeliverReportRequest(archive.id(),archive.version(),"凭证",LocalDateTime.now().plusDays(1))));
        var sent=reports.deliver(new DeliverReportRequest(archive.id(),archive.version(),"测试：线下交接编号 DEMO，仅记录事实",LocalDateTime.now()));
        assertNotNull(sent.deliveredAt());assertEquals(original,sent.snapshot().dueCount());
        assertThrows(BizException.class,()->reports.deliver(new DeliverReportRequest(archive.id(),archive.version(),"重复",LocalDateTime.now())));
    }
}
