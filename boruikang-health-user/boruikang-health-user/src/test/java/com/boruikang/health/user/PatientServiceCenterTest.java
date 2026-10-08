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
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:patient-center;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1","logging.level.root=WARN"})
@Transactional
class PatientServiceCenterTest {
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
 @Test void verifiedPortalContainsOnlyPatientScopedJourneys(){var t=verified();var j=journey();var portal=service.portal(new PatientEntryAccessRequest(t.token()));assertEquals("VERIFIED",portal.status());assertEquals(j.id,portal.journeys().getFirst().id());assertEquals(p.id,contacts.selectByPrimaryKey(c.id).patientId);}
 @Test void feedbackCreatesOneClinicalCaseAndReplayIsSafe(){var t=verified();var j=journey();var req=new PatientEntryFeedbackRequest(t.token(),j.id,"same-request","CLINICAL","虚构病情反馈");service.feedback(req);service.feedback(req);var ex=new JourneyCaseExample();ex.eq("journey_id",j.id);var rows=cases.selectByExample(ex);assertEquals(1,rows.size());assertEquals("CLINICAL",rows.getFirst().kind);assertEquals("OPEN",rows.getFirst().status);assertEquals(2L,rows.getFirst().doctorId);assertThrows(BizException.class,()->service.feedback(new PatientEntryFeedbackRequest(t.token(),j.id,"same-request","SERVICE","不同内容")));}
 @Test void crossPatientJourneyFeedbackIsRejected(){var t=verified();var j=journey();var patch=new ServiceJourney();patch.patientId=p.id+10000;var ex=new ServiceJourneyExample();ex.eq("id",j.id);journeys.updateByExampleSelective(patch,ex);assertThrows(BizException.class,()->service.feedback(new PatientEntryFeedbackRequest(t.token(),j.id,"request","SERVICE","反馈")));}
 @Test void reissuingRevokesOldToken(){var old=issue();var next=issue();assertThrows(BizException.class,()->service.portal(new PatientEntryAccessRequest(old.token())));assertEquals("ISSUED",service.portal(new PatientEntryAccessRequest(next.token())).status());}
 @Test void expirationAndManualRevocationBlockAccess(){var t=issue();var patch=new PatientServiceEntry();patch.expiresAt=LocalDateTime.now().minusSeconds(1);var ex=new PatientServiceEntryExample();ex.eq("id",t.id());entries.updateByExampleSelective(patch,ex);assertThrows(BizException.class,()->service.portal(new PatientEntryAccessRequest(t.token())));var next=issue();service.revoke(new ServiceEntryRevokeRequest(next.id(),0,"虚构撤销"));assertThrows(BizException.class,()->service.portal(new PatientEntryAccessRequest(next.token())));}
 @Test void unbindingOrConsentWithdrawalStopsAccess(){var t=verified();var patch=new WechatContact();patch.patientId=0L;var ex=new WechatContactExample();ex.eq("id",c.id);contacts.updateByExampleSelective(patch,ex);assertThrows(BizException.class,()->service.portal(new PatientEntryAccessRequest(t.token())));patch.patientId=p.id;contacts.updateByExampleSelective(patch,ex);authorization.withdraw(patients.selectByPrimaryKey(p.id),"虚构撤回授权");assertThrows(BizException.class,()->service.portal(new PatientEntryAccessRequest(t.token())));}
 @Test void staffCannotIssueForAnotherHospitalOrOwner(){actor("MANAGER",11,2);assertThrows(BizException.class,this::issue);actor("OPERATOR",7,1);assertThrows(BizException.class,this::issue);actor("PLATFORM_ADMIN",12,1);assertThrows(BizException.class,this::issue);actor("DOCTOR",2,1);assertThrows(BizException.class,this::issue);}
 @Test void staleVerificationIsRejected(){var t=issue();service.register(registerRequest(t.token()));assertThrows(BizException.class,()->service.verify(new ServiceEntryVerifyRequest(t.id(),0,p.id,"虚构核实")));assertEquals("REGISTERED",entries.selectByPrimaryKey(t.id()).status);}
 @Test void pausedOrClosedJourneyCannotReceiveFeedback(){var t=verified();var j=journey();var patch=new ServiceJourney();patch.status="CLOSED";var ex=new ServiceJourneyExample();ex.eq("id",j.id);journeys.updateByExampleSelective(patch,ex);assertThrows(BizException.class,()->service.feedback(new PatientEntryFeedbackRequest(t.token(),j.id,"request","SERVICE","反馈")));}
 @Test void invalidTokenDoesNotExposeIdentity(){assertThrows(BizException.class,()->service.portal(new PatientEntryAccessRequest("invalid")));assertThrows(BizException.class,()->service.portal(new PatientEntryAccessRequest("a".repeat(43))));}
}
