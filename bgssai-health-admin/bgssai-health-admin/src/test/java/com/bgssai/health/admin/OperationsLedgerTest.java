package com.bgssai.health.admin;

import com.bgssai.health.appointment.dto.*;
import com.bgssai.health.appointment.service.AppointmentService;
import com.bgssai.health.auth.dto.AccountInfo;
import com.bgssai.health.auth.service.CurrentAccount;
import com.bgssai.health.common.exception.BizException;
import com.bgssai.health.invitation.dto.*;
import com.bgssai.health.invitation.service.InvitationService;
import com.bgssai.health.medication.dto.*;
import com.bgssai.health.medication.service.MedicationService;
import com.bgssai.health.org.dto.*;
import com.bgssai.health.org.service.OrgService;
import com.bgssai.health.patient.dto.*;
import com.bgssai.health.patient.service.PatientService;
import com.bgssai.health.patient.service.TimelineService;
import com.bgssai.health.plan.dto.*;
import com.bgssai.health.plan.service.*;
import com.bgssai.health.referral.dto.*;
import com.bgssai.health.referral.service.ReferralService;
import com.bgssai.health.report.dto.*;
import com.bgssai.health.report.service.MetricService;
import com.bgssai.health.screening.dto.*;
import com.bgssai.health.screening.service.ScreeningService;
import com.bgssai.health.task.dto.*;
import com.bgssai.health.task.service.TaskService;
import com.bgssai.health.template.dto.*;
import com.bgssai.health.template.service.TemplateService;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

/** 1.5 operations ledger: screening pool, invitations, appointments, packages, referrals, templates, metrics. All data fictional. */
@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:operations-ledger;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1","logging.level.root=WARN"})
@Transactional
class OperationsLedgerTest {
    @Autowired ScreeningService screenings;@Autowired InvitationService invitations;@Autowired AppointmentService appointments;@Autowired PatientService patients;
    @Autowired TaskService tasks;@Autowired OrgService orgs;@Autowired PlanService plans;@Autowired PackageService packages;@Autowired EnrollmentService enrollments;
    @Autowired ReferralService referrals;@Autowired TemplateService templates;@Autowired MedicationService medications;@Autowired MetricService metrics;@Autowired TimelineService timeline;
    @BeforeEach void setup(){actor(1L,"MANAGER");}
    @AfterEach void cleanup(){CurrentAccount.clear();}
    private void actor(Long id,String role){CurrentAccount.set(new AccountInfo(id,"Test",role,1L));}
    private String key(){return UUID.randomUUID().toString();}
    private LocalDateTime now(){return LocalDateTime.now().withNano(0);}
    private PatientResponse newPatient(boolean outreach){
        return patients.create(new CreatePatientRequest("测试患者",  "MALE",60,"00000009999","心血管内科","房颤",2L,3L,null,null,null,null,null,null,null,null,"OUTPATIENT","MANUAL",null,null,null,List.of("测试"),"HIGH","虚构院方评估",outreach));
    }
    private List<TaskResponse> tasksOf(Long patientId,String type){return tasks.query(new TaskQueryRequest(0,50,patientId,type,null,null,null)).items();}
    private InvitationResponse invite(Long patientId,String result,LocalDateTime next){
        return invitations.create(new CreateInvitationRequest(patientId,null,null,now().minusMinutes(1),"PHONE",result,"WILLING".equals(result)?"SELF":null,"测试邀约",next,"虚构通话记录",key()));
    }

    @Test void screeningIsJudgedThenEnrolledWithSlaOutreachTask(){
        var row=screenings.create(new CreateScreeningRequest("ECG_NETWORK","筛查对象","FEMALE",58,"00000008888","1234",now().minusHours(2),"房颤波形","心律失常",null,null,3L,"ECG-TEST-1","虚构"));
        assertEquals("NEW",row.poolStatus());
        assertThrows(BizException.class,()->screenings.enroll(new EnrollScreeningRequest(row.id(),row.version(),null,"心血管内科","房颤",2L,3L,null,null,true,null)));
        var judged=screenings.judge(new JudgeScreeningRequest(row.id(),row.version(),"HIGH_RISK","HIGH","院方心电室复核",null,null,null));
        assertEquals("HIGH_RISK",judged.poolStatus());assertEquals("HIGH",judged.riskLevel());
        var enrolled=screenings.enroll(new EnrollScreeningRequest(judged.id(),judged.version(),null,"心血管内科","房颤",2L,3L,null,null,true,null));
        assertEquals("ENROLLED",enrolled.poolStatus());assertNotNull(enrolled.patientId());
        var outreach=tasksOf(enrolled.patientId(),"OUTREACH");assertEquals(1,outreach.size());
        assertEquals("P1",outreach.getFirst().priority());assertNotNull(outreach.getFirst().slaDueAt());
        assertTrue(outreach.getFirst().slaDueAt().isBefore(LocalDateTime.now().plusHours(25)),"HIGH risk first contact within 24h");
        // idempotent duplicate by external id
        var dup=screenings.create(new CreateScreeningRequest("ECG_NETWORK","筛查对象","FEMALE",58,"00000008888","1234",now(),"房颤波形","心律失常",null,null,3L,"ECG-TEST-1",null));
        assertEquals(row.id(),dup.id());
    }
    @Test void importSkipsDuplicatesAndRejectsReusedBatch(){
        var rows=List.of(new ImportScreeningRequest.Row("甲","MALE",60,"00000007771",null,null,"血压偏高",null,"EXT-1"),new ImportScreeningRequest.Row("乙",null,null,"00000007772",null,null,"血糖偏高",null,"EXT-1"));
        var result=screenings.importRows(new ImportScreeningRequest("EXAM","BATCH-TEST-1",null,null,3L,rows));
        assertEquals(1,result.created());assertEquals(1,result.skipped());
        assertThrows(BizException.class,()->screenings.importRows(new ImportScreeningRequest("EXAM","BATCH-TEST-1",null,null,3L,rows)));
    }
    @Test void reachedInvitationClosesOutreachAndUnreachedRoundsEscalateLostContact(){
        var p=newPatient(true);assertEquals(1,tasksOf(p.id(),"OUTREACH").size());
        var first=invite(p.id(),"NO_ANSWER",now().plusHours(4));assertEquals(1,first.round());assertFalse(first.reached());
        assertEquals("IN_PROGRESS",tasksOf(p.id(),"OUTREACH").getFirst().status());
        invite(p.id(),"BUSY",now().plusHours(8));
        assertTrue(tasksOf(p.id(),"ALERT").stream().noneMatch(t->"LOST_CONTACT".equals(t.alertSource())));
        invite(p.id(),"NO_ANSWER",now().plusDays(1));
        var alerts=tasksOf(p.id(),"ALERT").stream().filter(t->"LOST_CONTACT".equals(t.alertSource())).toList();assertEquals(1,alerts.size());assertEquals("P1",alerts.getFirst().priority());
        invite(p.id(),"WRONG_NUMBER",now().plusDays(2));
        assertEquals(1,tasksOf(p.id(),"ALERT").stream().filter(t->"LOST_CONTACT".equals(t.alertSource())).count(),"lost-contact alert stays single while open");
        assertThrows(BizException.class,()->invite(p.id(),"NO_ANSWER",null));
        var reached=invite(p.id(),"WILLING",null);assertTrue(reached.reached());assertEquals(5,reached.round());
        assertEquals("COMPLETED",tasksOf(p.id(),"OUTREACH").getFirst().status());
        var detail=patients.detail(p.id());assertEquals("CONTACTED",detail.lifecycle());assertNotNull(detail.lastContactAt());
    }
    @Test void appointmentMirrorsRevisitTaskAndAdvancesLifecycle(){
        var p=newPatient(false);
        var a=appointments.create(new CreateAppointmentRequest(p.id(),null,null,null,"OUTPATIENT","GREEN_CHANNEL",now().plusDays(1),"心血管内科",2L,"虚构预约单",key()));
        assertEquals("BOOKED",a.status());assertNotNull(a.taskId());
        var task=tasksOf(p.id(),"REVISIT").getFirst();assertEquals("BOOKED",task.status());assertEquals(a.id(),task.appointmentId());
        assertEquals("BOOKED",patients.detail(p.id()).lifecycle());
        assertThrows(BizException.class,()->appointments.create(new CreateAppointmentRequest(p.id(),null,null,null,"EXAM","STAFF_BOOKED",now().plusDays(2),"心血管内科",null,"重复",key())));
        var reminded=appointments.transition(new TransitionAppointmentRequest(a.id(),a.version(),"REMIND",now(),null,null,null,null,"短信截图"));
        assertEquals("REMINDED",reminded.status());assertNotNull(reminded.reminderSentAt());
        var arrived=appointments.transition(new TransitionAppointmentRequest(a.id(),reminded.version(),"ARRIVE",now(),true,null,null,null,"签到记录"));
        assertEquals("ARRIVED",arrived.status());assertEquals("ARRIVED",tasksOf(p.id(),"REVISIT").getFirst().status());assertEquals("ARRIVED",patients.detail(p.id()).lifecycle());
        var done=appointments.transition(new TransitionAppointmentRequest(a.id(),arrived.version(),"COMPLETE",now(),null,null,"OUTPATIENT_TREATED","门诊处理",null));
        assertEquals("COMPLETED",done.status());assertEquals("COMPLETED",tasksOf(p.id(),"REVISIT").getFirst().status());
    }
    @Test void noShowRequiresReasonAndReopensRevisit(){
        var p=newPatient(false);
        var a=appointments.create(new CreateAppointmentRequest(p.id(),null,null,null,"EXAM","STAFF_BOOKED",now().plusDays(1),"心血管内科",null,"虚构预约单",key()));
        assertThrows(BizException.class,()->appointments.transition(new TransitionAppointmentRequest(a.id(),a.version(),"NO_SHOW",now(),null,null,null,null,null)));
        var missed=appointments.transition(new TransitionAppointmentRequest(a.id(),a.version(),"NO_SHOW",now(),null,"COST",null,"费用顾虑",null));
        assertEquals("NO_SHOW",missed.status());assertEquals("NO_SHOW",tasksOf(p.id(),"REVISIT").getFirst().status());
        var again=appointments.create(new CreateAppointmentRequest(p.id(),tasksOf(p.id(),"REVISIT").getFirst().id(),null,null,"EXAM","STAFF_BOOKED",now().plusDays(3),"心血管内科",null,"重新预约",key()));
        assertEquals("BOOKED",again.status());assertEquals("BOOKED",tasksOf(p.id(),"REVISIT").getFirst().status());
    }
    @Test void packageActivationExpandsPlanIntoTasksAndUpgradeReplacesThem(){
        var plan=plans.save(new SavePlanRequest(null,null,"测试方案","房颤","POST_VISIT",null,List.of(new PlanNodeDto(1,"ENROLLMENT",1,"FOLLOWUP","首次随访","P2","核对"),new PlanNodeDto(2,"D30",30,"REVISIT","月度复查","P2",null))));
        plan=plans.changeStatus(new ChangePlanStatusRequest(plan.id(),plan.version(),"ACTIVE"));
        var basic=packages.save(new SavePackageRequest(null,null,"TEST-BASIC","测试基础包","房颤","BASIC","POST_VISIT",90,0,2,1,1,null,null,null,null,null,plan.id()));
        assertThrows(BizException.class,()->enrollments.create(new CreateEnrollmentRequest(1001L,basic.id(),null,now(),now(),"同意书",null,true,key())),"draft package cannot be sold");
        var active=packages.changeStatus(new ChangePackageStatusRequest(basic.id(),basic.version(),"ACTIVE"));
        var premium=packages.changeStatus(new ChangePackageStatusRequest(packages.save(new SavePackageRequest(null,null,"TEST-PREMIUM","测试重点包","房颤","PREMIUM","LONG_TERM",365,199900,12,4,4,null,null,null,null,null,plan.id())).id(),0,"ACTIVE"));
        var p=newPatient(false);
        var e=enrollments.create(new CreateEnrollmentRequest(p.id(),active.id(),"ORD-1",now(),now(),"虚构同意书","测试",true,key()));
        assertEquals("ACTIVE",e.status());assertEquals(2,e.taskCount());assertEquals(LocalDate.now().plusDays(90),e.endDate());
        assertEquals("MANAGING",patients.detail(p.id()).lifecycle());assertEquals(active.id(),patients.detail(p.id()).servicePackageId());
        var generated=tasks.query(new TaskQueryRequest(0,20,p.id(),null,null,null,null,null,null,null,null,null,null,null,null,e.id())).items();
        assertEquals(2,generated.size());assertTrue(generated.stream().allMatch(t->e.id().equals(t.enrollmentId())&&t.planNodeSeq()!=null));
        assertThrows(BizException.class,()->enrollments.create(new CreateEnrollmentRequest(p.id(),active.id(),null,now(),now(),"重复",null,false,key())));
        var upgraded=enrollments.transition(new TransitionEnrollmentRequest(e.id(),e.version(),"UPGRADE",null,null,premium.id(),"ORD-2"));
        assertEquals("ACTIVE",upgraded.status());assertEquals(premium.id(),upgraded.packageId());assertEquals(LocalDate.now().plusDays(365),upgraded.endDate());
        var old=enrollments.query(new EnrollmentQueryRequest(0,10,p.id(),null,"UPGRADED",null,null,null)).items();assertEquals(1,old.size());assertEquals(upgraded.id(),old.getFirst().upgradeToId());
        var openOld=tasks.query(new TaskQueryRequest(0,20,p.id(),null,"PENDING",null,null,null,null,null,null,null,null,null,null,e.id())).items();assertTrue(openOld.isEmpty(),"old instance tasks cancelled");
        final Long planId=plan.id();assertThrows(BizException.class,()->plans.changeStatus(new ChangePlanStatusRequest(planId,1,"RETIRED")),"plan in use by active packages");
    }
    @Test void referralFlowTracksSlaAndFeedback(){
        var org=orgs.saveOrg(new SaveOrgRequest(null,"测试社区","COMMUNITY",null,null,null,true,null));
        var p=newPatient(false);
        var r=referrals.create(new CreateReferralRequest(p.id(),"INBOUND","UPWARD",org.id(),null,"社区发现房颤","HIGH",now().minusDays(8),"转诊单",key()));
        assertEquals("INITIATED",r.status());assertTrue(r.overdue(),"HIGH risk arrival SLA is 7 days");
        assertThrows(BizException.class,()->referrals.create(new CreateReferralRequest(p.id(),"INBOUND","UPWARD",org.id(),null,"重复","HIGH",now(),"x",key())));
        var accepted=referrals.transition(new TransitionReferralRequest(r.id(),r.version(),"ACCEPT",now(),null,null,null,null,null,"接收回执"));
        var arrived=referrals.transition(new TransitionReferralRequest(r.id(),accepted.version(),"ARRIVE",now(),null,null,null,null,null,"到达签到"));
        assertEquals("ARRIVED",patients.detail(p.id()).lifecycle());
        assertThrows(BizException.class,()->referrals.transition(new TransitionReferralRequest(r.id(),arrived.version(),"FEEDBACK",now(),null,null,null,null,null,null)));
        var fed=referrals.transition(new TransitionReferralRequest(r.id(),arrived.version(),"FEEDBACK",now(),"心血管内科",2L,"持续性房颤","抗凝治疗，社区随访",null,null));
        assertEquals("FEEDBACK_RECORDED",fed.status());assertFalse(fed.overdue());
        assertEquals("CLOSED",referrals.transition(new TransitionReferralRequest(r.id(),fed.version(),"CLOSE",now(),null,null,null,null,null,null)).status());
    }
    @Test void templatesAndMessageLogsAreManualOnly(){
        var t=templates.save(new SaveTemplateRequest(null,null,"TEST-SMS","SMS","ARRIVAL_REMINDER","测试提醒","您好，{日期}请到院。",true));
        assertThrows(BizException.class,()->templates.save(new SaveTemplateRequest(null,null,"TEST-SMS","SMS","OTHER","重复","x",true)));
        var p=newPatient(false);
        var a=appointments.create(new CreateAppointmentRequest(p.id(),null,null,null,"OUTPATIENT","STAFF_BOOKED",now().plusDays(1),"心血管内科",null,"预约单",key()));
        String k=key();
        var log=templates.logMessage(new LogMessageRequest(p.id(),a.taskId(),"SMS",t.code(),"您好，明天请到院。",now(),"短信平台流水 1",k));
        assertEquals(log.id(),templates.logMessage(new LogMessageRequest(p.id(),a.taskId(),"SMS",t.code(),"您好，明天请到院。",now(),"短信平台流水 1",k)).id());
        assertNotNull(tasksOf(p.id(),"REVISIT").getFirst().reminderSentAt());
        assertEquals(1,templates.logs(new MessageLogQueryRequest(0,10,p.id(),null,null,null,null)).items().size());
        actor(20L,"OPERATOR");assertThrows(BizException.class,()->templates.save(new SaveTemplateRequest(null,null,"TEST-2","SMS","OTHER","x","y",true)));
    }
    @Test void medicationLedgerAndConsentAndTimeline(){
        var p=newPatient(false);
        var m=medications.save(new SaveMedicationRequest(null,null,p.id(),"测试药 A","1 片","每日一次",LocalDate.now().minusDays(3),null,null,"HOSPITAL_RECORD","GOOD",null));
        assertEquals("ACTIVE",m.status());
        var stopped=medications.save(new SaveMedicationRequest(m.id(),m.version(),p.id(),"测试药 A","1 片","每日一次",LocalDate.now().minusDays(3),LocalDate.now(),"STOPPED","PATIENT_REPORT","POOR","自行停药"));
        assertEquals("STOPPED",stopped.status());assertEquals(1,medications.query(new MedicationQueryRequest(p.id(),null)).size());
        var consented=patients.consent(new ConsentRequest(p.id(),patients.detail(p.id()).version(),now(),"HEALTH-MVP-1","签字件 T-1"));
        assertEquals("HEALTH-MVP-1",consented.consentVersion());
        var tl=timeline.timeline(new TimelineQueryRequest(p.id(),50));
        assertTrue(tl.events().stream().anyMatch(e->"MEDICATION".equals(e.kind())));assertTrue(tl.events().stream().anyMatch(e->"CONSENT".equals(e.kind())));
        assertEquals(List.of("测试"),patients.detail(p.id()).tags());
        assertEquals(1,patients.query(new PatientQueryRequest(0,10,null,null,null,null,null,null,null,null,"测试",null,null,null,null,null,null,null)).items().stream().filter(x->x.id().equals(p.id())).count());
    }
    @Test void lifecycleExitNeedsReasonAndAlertCloseNeedsDisposition(){
        var p=newPatient(false);
        assertThrows(BizException.class,()->patients.update(new UpdatePatientRequest(p.id(),p.version(),null,null,"LOST",null,null,null,null)));
        var lost=patients.update(new UpdatePatientRequest(p.id(),p.version(),null,null,"LOST",null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"多次未联系上"));
        assertEquals("LOST",lost.lifecycle());assertNotNull(lost.lostSince());
        var alert=tasks.create(new CreateTaskRequest(1001L,"ALERT","测试异常","P1",now().plusHours(4),null,null,key(),"OBSERVATION"));
        assertEquals("OBSERVATION",alert.alertSource());assertNotNull(alert.slaDueAt());
        var claimed=tasks.claim(new ClaimTaskRequest(alert.id(),alert.version()));assertNotNull(claimed.ackAt());
        var escalated=tasks.transition(new TransitionTaskRequest(alert.id(),claimed.version(),"ESCALATE",null,null));
        assertThrows(BizException.class,()->tasks.transition(new TransitionTaskRequest(alert.id(),escalated.version(),"COMPLETE","运营代登记处置","虚构处置凭证","OUTPATIENT")));
        actor(2L,"DOCTOR");
        assertThrows(BizException.class,()->tasks.transition(new TransitionTaskRequest(alert.id(),escalated.version(),"COMPLETE","医生已处置",null,null)));
        var closed=tasks.transition(new TransitionTaskRequest(alert.id(),escalated.version(),"COMPLETE","医生已处置",null,"OUTPATIENT"));
        assertEquals("COMPLETED",closed.status());assertEquals("OUTPATIENT",closed.disposition());
        actor(1L,"MANAGER");
        var handed=tasks.reassign(new ReassignTaskRequest(tasksOf(1001L,"FOLLOWUP").getFirst().id(),tasksOf(1001L,"FOLLOWUP").getFirst().version(),20L,"人员调整"));
        assertEquals(20L,handed.assigneeId());
        actor(3L,"OPERATOR");assertThrows(BizException.class,()->tasks.reassign(new ReassignTaskRequest(handed.id(),handed.version(),3L,"抢回")));
    }
    @Test void metricsFunnelOperatorsDailyAndWorkbenchCompute(){
        var q=new MetricQueryRequest(LocalDate.now().minusDays(30),LocalDate.now(),null,null);
        var report=metrics.metrics(q);assertEquals(10,report.metrics().size());assertEquals("MANAGED",report.metrics().getFirst().code());
        assertTrue(report.metrics().stream().anyMatch(m->"REACH_RATE".equals(m.code())&&m.denominator()!=null));
        var funnel=metrics.funnel(q);assertTrue(funnel.screened()>0);assertTrue(funnel.invited()>0);assertFalse(funnel.campaigns().isEmpty());
        var ops=metrics.operators(q);assertFalse(ops.isEmpty());assertTrue(ops.stream().allMatch(o->o.rating()!=null));
        var daily=metrics.daily(new DailyQueryRequest(LocalDate.now()));assertNotNull(daily);
        var wb=metrics.workbench();assertEquals(8,wb.queues().size());
        assertEquals(10,metrics.dictionary().size());
        assertThrows(BizException.class,()->metrics.metrics(new MetricQueryRequest(LocalDate.now().minusDays(400),LocalDate.now(),null,null)));
        actor(3L,"OPERATOR");assertEquals(1,metrics.operators(q).size(),"operator sees only own scorecard");
    }
    @Test void slaDefaultsAndOverridesResolvePerRisk(){
        var rows=orgs.slas();assertEquals(5,rows.size());
        var saved=orgs.saveSla(new SaveSlaRequest("CRITICAL",1,1,1,2,"更严格"));assertEquals(1,saved.firstContactHours());
        assertEquals(1,orgs.resolve("CRITICAL").firstContactHours);assertEquals(24,orgs.resolve("HIGH").firstContactHours);
        actor(3L,"OPERATOR");assertThrows(BizException.class,()->orgs.saveSla(new SaveSlaRequest("LOW",1,1,1,1,null)));
    }
}
