package com.boruikang.health.user;
import com.boruikang.health.auth.dto.AccountInfo;
import com.boruikang.health.auth.service.CurrentAccount;
import com.boruikang.health.common.exception.BizException;
import com.boruikang.health.mapper.*;
import com.boruikang.health.model.*;
import com.boruikang.health.servicecenter.dto.*;
import com.boruikang.health.servicecenter.service.PatientServiceCenter;
import com.boruikang.health.journey.service.ServiceAuthorization;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.time.LocalDate;
import com.boruikang.health.continuity.dto.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:patient-center;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1","logging.level.root=WARN"})
@Transactional
class PatientServiceCenterTest {
 @Autowired com.boruikang.health.continuity.service.ContinuousCareService continuity;
 @Autowired com.boruikang.health.continuity.service.PatientServiceSummary summary;
 @Autowired com.boruikang.health.mapper.ContinuousCareReviewMapper continuousReviews;

 @Autowired PatientServiceCenter service;
 @Autowired PatientServiceEntryMapper entries;
 @Autowired WechatContactMapper contacts;
 @Autowired PatientMapper patients;
 @Autowired ServiceJourneyMapper journeys;
 @Autowired JourneyCaseMapper cases;
 @Autowired ServiceAuthorization authorization;
 private WechatContact c; private Patient p;
 void actor(String role,long id,long hospital){CurrentAccount.set(new AccountInfo(id,"虚构测试人员",role,hospital));}
 @BeforeEach void setup(){
  actor("MANAGER",1,1);
  p=new Patient();p.hospitalId=1L;p.name="虚构患者";p.gender="FEMALE";p.age=50;p.phone="13800000000";p.department="心血管科";p.disease="虚构管理原因";p.lifecycle="MANAGING";p.riskLevel="UNKNOWN";p.ownerId=6L;p.doctorId=2L;p.version=0;p.consentAt=LocalDateTime.now().minusDays(1);p.consentVersion="test";p.consentEvidence="虚构授权";p.creator="test";patients.insertSelective(p);
  c=new WechatContact();c.hospitalId=1L;c.channel="WE_COM";c.externalId=UUID.randomUUID().toString();c.nickname="虚构联系人";c.staffAccountId=6L;c.relation="ACTIVE";c.patientId=0L;c.pendingCount=0;c.version=0;c.mock=true;c.creator="test";contacts.insertSelective(c);
 }
 @AfterEach void clear(){CurrentAccount.clear();}
 ServiceEntryIssuedResponse issue(){return service.issue(new ServiceEntryIssueRequest(c.id));}
 PatientEntryRegisterRequest registerRequest(String token){return new PatientEntryRegisterRequest(token,"虚构患者","13800000000","SELF","FULL",true);}
 ServiceEntryIssuedResponse verified(){var ticket=issue();service.register(registerRequest(ticket.token()));var entry=entries.selectByPrimaryKey(ticket.id());service.verify(new ServiceEntryVerifyRequest(entry.id,entry.version,p.id,"虚构身份及授权核实"));return ticket;}
 ServiceJourney journey(){var j=new ServiceJourney();j.hospitalId=1L;j.patientId=p.id;j.kind="OUTPATIENT";j.entryPhase="FULL";j.sourceSystem="TEST";j.eventKey=UUID.randomUUID().toString();j.eventAt=LocalDateTime.now();j.status="ACTIVE";j.stage=1;j.ownerId=6L;j.doctorId=2L;j.identityEvidence="虚构身份核实";j.handoffEvidence="虚构交接事项";j.noRevisit=false;j.version=0;j.creator="test";journeys.insertSelective(j);return j;}
 @Test void registrationIsIdempotentAndDoesNotAutoBind(){var t=issue();assertEquals("REGISTERED",service.register(registerRequest(t.token())).status());assertEquals("REGISTERED",service.register(registerRequest(t.token())).status());assertEquals(0L,contacts.selectByPrimaryKey(c.id).patientId);assertNull(entries.selectByPrimaryKey(t.id()).patientId);assertNotEquals(t.token(),entries.selectByPrimaryKey(t.id()).tokenHash);}
 @Test void editedRegistrationCannotOverwritePriorConsent(){var t=issue();service.register(registerRequest(t.token()));assertThrows(BizException.class,()->service.register(new PatientEntryRegisterRequest(t.token(),"其他人","13800000000","SELF","FULL",true)));}
 @Test void familyConsentStillRequiresStaffVerification(){var t=issue();assertEquals("REGISTERED",service.register(new PatientEntryRegisterRequest(t.token(),"虚构患者","13800000000","FAMILY","AFTER_CARE",true)).status());assertThrows(BizException.class,()->service.feedback(new PatientEntryFeedbackRequest(t.token(),1L,"request","SERVICE","请联系")));}
 @Test void verifiedPortalContainsOnlyPatientScopedJourneys(){var t=verified();var j=journey();var portal=service.portal(new PatientEntryAccessRequest(t.token()));assertEquals("VERIFIED",portal.status());assertEquals(j.id,portal.journeys().getFirst().id());assertEquals("诊前",portal.journeys().getFirst().phase());var jp=new ServiceJourney();jp.entryPhase="AFTER_CARE";var je=new ServiceJourneyExample();je.eq("id",j.id);journeys.updateByExampleSelective(jp,je);assertEquals("诊后",service.portal(new PatientEntryAccessRequest(t.token())).journeys().getFirst().phase());assertEquals(p.id,contacts.selectByPrimaryKey(c.id).patientId);}
 @Test void feedbackCreatesOneClinicalCaseAndReplayIsSafe(){var t=verified();var j=journey();var req=new PatientEntryFeedbackRequest(t.token(),j.id,"same-request","CLINICAL","虚构病情反馈");service.feedback(req);service.feedback(req);var ex=new JourneyCaseExample();ex.eq("journey_id",j.id);var rows=cases.selectByExample(ex);assertEquals(1,rows.size());assertEquals("CLINICAL",rows.getFirst().kind);assertEquals("OPEN",rows.getFirst().status);assertEquals(2L,rows.getFirst().doctorId);assertThrows(BizException.class,()->service.feedback(new PatientEntryFeedbackRequest(t.token(),j.id,"same-request","SERVICE","不同内容")));}
 @Test void crossPatientJourneyFeedbackIsRejected(){var t=verified();var j=journey();var patch=new ServiceJourney();patch.patientId=p.id+10000;var ex=new ServiceJourneyExample();ex.eq("id",j.id);journeys.updateByExampleSelective(patch,ex);assertThrows(BizException.class,()->service.feedback(new PatientEntryFeedbackRequest(t.token(),j.id,"request","SERVICE","反馈")));}
 @Test void reissuingRevokesOldToken(){var old=issue();var next=issue();assertThrows(BizException.class,()->service.portal(new PatientEntryAccessRequest(old.token())));assertEquals("ISSUED",service.portal(new PatientEntryAccessRequest(next.token())).status());}
 @Test void expirationAndManualRevocationBlockAccess(){var t=issue();var patch=new PatientServiceEntry();patch.expiresAt=LocalDateTime.now().minusSeconds(1);var ex=new PatientServiceEntryExample();ex.eq("id",t.id());entries.updateByExampleSelective(patch,ex);assertThrows(BizException.class,()->service.portal(new PatientEntryAccessRequest(t.token())));var next=issue();service.revoke(new ServiceEntryRevokeRequest(next.id(),0,"虚构撤销"));assertThrows(BizException.class,()->service.portal(new PatientEntryAccessRequest(next.token())));}
 @Test void unbindingOrConsentWithdrawalStopsAccess(){var t=verified();var patch=new WechatContact();patch.patientId=0L;var ex=new WechatContactExample();ex.eq("id",c.id);contacts.updateByExampleSelective(patch,ex);assertThrows(BizException.class,()->service.portal(new PatientEntryAccessRequest(t.token())));patch.patientId=p.id;contacts.updateByExampleSelective(patch,ex);authorization.withdraw(patients.selectByPrimaryKey(p.id),"虚构撤回授权");assertThrows(BizException.class,()->service.portal(new PatientEntryAccessRequest(t.token())));}
 @Test void staffCannotIssueForAnotherHospitalOrOwner(){actor("MANAGER",11,2);assertThrows(BizException.class,this::issue);actor("OPERATOR",7,1);assertThrows(BizException.class,this::issue);actor("PLATFORM_ADMIN",12,1);assertThrows(BizException.class,this::issue);actor("DOCTOR",2,1);assertThrows(BizException.class,this::issue);}
 @Test void staleVerificationIsRejected(){var t=issue();service.register(registerRequest(t.token()));assertThrows(BizException.class,()->service.verify(new ServiceEntryVerifyRequest(t.id(),0,p.id,"虚构核实")));assertEquals("REGISTERED",entries.selectByPrimaryKey(t.id()).status);}
 @Test void pausedOrClosedJourneyCannotReceiveFeedback(){var t=verified();var j=journey();var patch=new ServiceJourney();patch.status="CLOSED";var ex=new ServiceJourneyExample();ex.eq("id",j.id);journeys.updateByExampleSelective(patch,ex);assertThrows(BizException.class,()->service.feedback(new PatientEntryFeedbackRequest(t.token(),j.id,"request","SERVICE","反馈")));}
 @Test void invalidTokenDoesNotExposeIdentity(){assertThrows(BizException.class,()->service.portal(new PatientEntryAccessRequest("invalid")));assertThrows(BizException.class,()->service.portal(new PatientEntryAccessRequest("a".repeat(43))));}

 ContinuousCareResponse plan(){return continuity.save(new SaveContinuousCareRequest(null,null,p.id,"虚构基线，待医生核对","虚构个人目标，不构成医学建议","按本患者已确认安排联系团队",LocalDate.now().plusDays(15),"虚构报告来源"));}
 ContinuousCareResponse approvePlan(ContinuousCareResponse plan){actor("DOCTOR",2,1);return continuity.approve(new ApproveContinuousCareRequest(plan.id(),plan.version(),true,"本人核对虚构计划"));}
 @Test void onlyCurrentDoctorApprovedPlanIsVisibleAndRevisionPreservesHistory(){
  var ticket=verified();var plan=plan();assertTrue(service.portal(new PatientEntryAccessRequest(ticket.token())).continuousPlans().isEmpty());
  var unapproved=plan;assertThrows(BizException.class,()->continuity.approve(new ApproveContinuousCareRequest(unapproved.id(),unapproved.version(),true,"运营不得代审")));
  plan=approvePlan(plan);assertEquals(1,service.portal(new PatientEntryAccessRequest(ticket.token())).continuousPlans().size());
  var approved=plan;plan=continuity.save(new SaveContinuousCareRequest(plan.id(),plan.version(),p.id,"虚构更新基线","修改管理目标","新的患者安排",LocalDate.now().plusDays(20),"新反馈"));
  assertEquals(2,plan.revision());assertTrue(service.portal(new PatientEntryAccessRequest(ticket.token())).continuousPlans().isEmpty());
  assertTrue(plan.history().stream().anyMatch(r->r.kind().equals("PLAN_SAVED")&&r.summary().contains("虚构个人目标")));
  assertThrows(BizException.class,()->continuity.approve(new ApproveContinuousCareRequest(approved.id(),approved.version(),true,"旧版本")));
 }
 @Test void independentJourneysSharePlanAndClosedEncounterDoesNotCloseProgramme(){
  var ticket=verified();var first=journey();var second=journey();var plan=plan();
  plan=continuity.link(new LinkContinuousJourneyRequest(plan.id(),plan.version(),first.id,"第一次就医"));
  plan=continuity.link(new LinkContinuousJourneyRequest(plan.id(),plan.version(),second.id,"再次就医"));plan=approvePlan(plan);
  var patch=new ServiceJourney();patch.status="CLOSED";var ex=new ServiceJourneyExample();ex.eq("id",first.id);journeys.updateByExampleSelective(patch,ex);
  plan=continuity.review(new ReviewContinuousCareRequest(plan.id(),plan.version(),first.id,"虚构阶段变化","虚构结果核实","继续按本人的安排管理","UNKNOWN",LocalDate.now().plusDays(30)));
  assertEquals("ACTIVE",plan.status());assertEquals(2,plan.journeyIds().size());assertEquals("继续按本人的安排管理",service.portal(new PatientEntryAccessRequest(ticket.token())).continuousPlans().getFirst().lastFeedback());
  assertEquals(2,summary.summary(new ContinuousCareQueryRequest(p.id)).journeys().size());
 }
 @Test void reissuedEntryRetainsOnlySameContactPatientFeedback(){
  var old=verified();var j=journey();service.feedback(new PatientEntryFeedbackRequest(old.token(),j.id,"original","SERVICE","患者原始反馈"));
  var next=verified();assertEquals(1,service.portal(new PatientEntryAccessRequest(next.token())).feedback().size());
  assertThrows(BizException.class,()->service.portal(new PatientEntryAccessRequest(old.token())));
  var other=new WechatContact();other.hospitalId=1L;other.channel="WE_COM";other.externalId=UUID.randomUUID().toString();other.nickname="另一位家属";other.staffAccountId=6L;other.relation="ACTIVE";other.patientId=p.id;other.pendingCount=0;other.version=0;other.mock=true;other.creator="test";contacts.insertSelective(other);
  var ot=service.issue(new ServiceEntryIssueRequest(other.id));service.register(registerRequest(ot.token()));service.verify(new ServiceEntryVerifyRequest(ot.id(),1,p.id,"另一家属核实"));
  assertTrue(service.portal(new PatientEntryAccessRequest(ot.token())).feedback().isEmpty());
 }
 @Test void patientReplyRequiresProcessedCaseAndCorrectClinicalRole(){
  var t=verified();var j=journey();service.feedback(new PatientEntryFeedbackRequest(t.token(),j.id,"clinical","CLINICAL","虚构症状反馈"));
  var f=service.feedbackQuery(new ContinuousCareQueryRequest(p.id)).getFirst();
  assertThrows(BizException.class,()->service.feedbackReply(new ReplyPatientFeedbackRequest(f.id(),f.caseVersion(),"不得代医生回复")));
  actor("DOCTOR",2,1);assertThrows(BizException.class,()->service.feedbackReply(new ReplyPatientFeedbackRequest(f.id(),f.caseVersion(),"尚未处理不得回复")));
  var cp=new JourneyCase();cp.status="RESOLVED";cp.resolution="仅内部可见的处理记录";cp.version=f.caseVersion()+1;var ex=new JourneyCaseExample();ex.eq("id",f.caseId());cases.updateByExampleSelective(cp,ex);
  service.feedbackReply(new ReplyPatientFeedbackRequest(f.id(),cp.version,"医生确认的患者回复及下一步"));
  var portal=service.portal(new PatientEntryAccessRequest(t.token()));assertEquals("医生确认的患者回复及下一步",portal.feedback().getFirst().patientReply());assertFalse(portal.toString().contains("仅内部可见"));
 }
 @Test void reassignmentPauseAndWithdrawalBlockOldClinicalPlan(){
  var ticket=verified();var plan=approvePlan(plan());
  var patch=new Patient();patch.doctorId=3L;var ex=new PatientExample();ex.eq("id",p.id);patients.updateByExampleSelective(patch,ex);
  assertTrue(service.portal(new PatientEntryAccessRequest(ticket.token())).continuousPlans().isEmpty());
  actor("MANAGER",1,1);assertEquals("REQUIRES_REVIEW",continuity.query(new ContinuousCareQueryRequest(p.id)).getFirst().approvalStatus());
  authorization.withdraw(patients.selectByPrimaryKey(p.id),"虚构授权撤回");assertThrows(BizException.class,()->continuity.transition(new TransitionContinuousCareRequest(plan.id(),plan.version(),"PAUSE","撤回后阻断")));
  assertThrows(BizException.class,()->service.portal(new PatientEntryAccessRequest(ticket.token())));
 }
 @Test void crossPatientLinkAndAnotherHospitalSummaryAreRejected(){
  var plan=plan();var j=journey();var patch=new ServiceJourney();patch.patientId=p.id+100000;var ex=new ServiceJourneyExample();ex.eq("id",j.id);journeys.updateByExampleSelective(patch,ex);
  assertThrows(BizException.class,()->continuity.link(new LinkContinuousJourneyRequest(plan.id(),plan.version(),j.id,"跨患者关联")));
  actor("MANAGER",11,2);assertThrows(BizException.class,()->summary.summary(new ContinuousCareQueryRequest(p.id)));assertThrows(BizException.class,()->continuity.query(new ContinuousCareQueryRequest(p.id)));
 }
 @Test void consecutiveFortyPatientsKeepSeparatePlansFeedbackAndNextReviews(){
  Set<Long> ids=new HashSet<>();Set<Long> planIds=new HashSet<>();
  for(int i=0;i<40;i++){
   if(i>0)setup();ids.add(p.id);var t=verified();var first=journey();var second=journey();var plan=plan();planIds.add(plan.id());
   plan=continuity.link(new LinkContinuousJourneyRequest(plan.id(),plan.version(),first.id,"首个虚构就医事件"));plan=continuity.link(new LinkContinuousJourneyRequest(plan.id(),plan.version(),second.id,"第二个虚构就医事件"));
   plan=approvePlan(plan);var req=new PatientEntryFeedbackRequest(t.token(),second.id,"cohort-"+i,"SERVICE","虚构连续入组反馈-"+i);service.feedback(req);service.feedback(req);
   plan=continuity.review(new ReviewContinuousCareRequest(plan.id(),plan.version(),second.id,"虚构阶段评价-"+i,"虚构反馈及记录","患者下一步-"+i,"UNKNOWN",LocalDate.now().plusDays(10+i)));
   var portal=service.portal(new PatientEntryAccessRequest(t.token()));assertEquals(1,portal.continuousPlans().size());assertEquals(1,portal.feedback().size());assertEquals("虚构连续入组反馈-"+i,portal.feedback().getFirst().content());assertEquals("患者下一步-"+i,portal.continuousPlans().getFirst().lastFeedback());
   assertEquals(2,summary.summary(new ContinuousCareQueryRequest(p.id)).journeys().size());
  }
  assertEquals(40,ids.size());assertEquals(40,planIds.size());
 }

 @Test void renewedConsentNeverRevivesOldInvitationOrOldReview(){
  var ticket=verified();assertTrue(ticket.path().endsWith("/service#"+ticket.token()));assertTrue(ticket.path().startsWith("http"));
  var plan=approvePlan(plan());plan=continuity.review(new ReviewContinuousCareRequest(plan.id(),plan.version(),null,"此前阶段复盘","虚构依据","此前授权下的阶段回复","UNKNOWN",LocalDate.now().plusDays(10)));
  actor("MANAGER",1,1);authorization.withdraw(patients.selectByPrimaryKey(p.id),"虚构撤回");
  var patch=new Patient();patch.consentAt=LocalDateTime.now().plusSeconds(1);patch.consentEvidence="重新核实后的新授权";var ex=new PatientExample();ex.eq("id",p.id);patients.updateByExampleSelective(patch,ex);
  assertThrows(BizException.class,()->service.portal(new PatientEntryAccessRequest(ticket.token())));
  var next=verified();assertTrue(service.portal(new PatientEntryAccessRequest(next.token())).continuousPlans().isEmpty());
  plan=approvePlan(continuity.query(new ContinuousCareQueryRequest(p.id)).getFirst());
  var portal=service.portal(new PatientEntryAccessRequest(next.token()));assertEquals(1,portal.continuousPlans().size());assertNull(portal.continuousPlans().getFirst().lastFeedback());
 }

}
