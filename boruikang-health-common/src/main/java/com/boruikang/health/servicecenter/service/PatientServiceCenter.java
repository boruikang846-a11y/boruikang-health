package com.boruikang.health.servicecenter.service;

import com.boruikang.health.audit.service.AuditService;
import com.boruikang.health.auth.service.CurrentAccount;
import com.boruikang.health.common.*;
import com.boruikang.health.journey.service.ServiceAuthorization;
import com.boruikang.health.mapper.*;
import com.boruikang.health.model.*;
import com.boruikang.health.patient.service.*;
import com.boruikang.health.servicecenter.dto.*;
import com.boruikang.health.wechat.service.WechatLedger;
import com.github.pagehelper.PageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.security.*;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;

/** Hospital-owned WeCom entry. Tokens identify an authorized contact, never a patient number. */
@Service
public class PatientServiceCenter {
 public static final String CONSENT_VERSION="patient-service-2.1-brk";
 private final PatientServiceEntryMapper entries; private final PatientServiceFeedbackMapper feedback;
 private final WechatContactMapper contacts; private final PatientMapper patients;
 private final ServiceJourneyMapper journeys; private final JourneyCaseMapper cases;
 private final PatientAccess access; private final ServiceAuthorization authorization; private final WechatLedger ledger; private final AuditService audit;
 public PatientServiceCenter(PatientServiceEntryMapper entries,PatientServiceFeedbackMapper feedback,WechatContactMapper contacts,
 PatientMapper patients,ServiceJourneyMapper journeys,JourneyCaseMapper cases,PatientAccess access,ServiceAuthorization authorization,WechatLedger ledger,AuditService audit){
  this.entries=entries;this.feedback=feedback;this.contacts=contacts;this.patients=patients;this.journeys=journeys;this.cases=cases;
  this.access=access;this.authorization=authorization;this.ledger=ledger;this.audit=audit;
 }
 private static String hash(String value){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));}catch(NoSuchAlgorithmException e){throw new IllegalStateException(e);}}
 private WechatContact contact(Long id){var c=contacts.selectByPrimaryKey(id);Checks.found(c!=null&&CurrentAccount.get().hospitalId().equals(c.hospitalId));Checks.require("WE_COM".equals(c.channel)&&"ACTIVE".equals(c.relation),"需要有效的博瑞康企业微信联系人");return c;}
 private void contactAccess(WechatContact c){access.operations();if(c.patientId!=null&&c.patientId>0)access.require(c.patientId);else if(access.executor())Checks.permit(CurrentAccount.get().userId().equals(c.staffAccountId));}
 private PatientServiceEntry lockEntry(Long id){var ex=new PatientServiceEntryExample();ex.eq("id",id).eq("hospital_id",CurrentAccount.get().hospitalId());ex.setForUpdate(true);var rows=entries.selectByExample(ex);Checks.found(!rows.isEmpty());return rows.getFirst();}
 private WechatContact lockContact(Long id){var ex=new WechatContactExample();ex.eq("id",id).eq("hospital_id",CurrentAccount.get().hospitalId());ex.setForUpdate(true);var rows=contacts.selectByExample(ex);Checks.found(!rows.isEmpty());var c=rows.getFirst();Checks.require("WE_COM".equals(c.channel)&&"ACTIVE".equals(c.relation),"需要有效的博瑞康企业微信联系人");contactAccess(c);return c;}
 @Transactional
 public ServiceEntryIssuedResponse issue(ServiceEntryIssueRequest req){
  access.operations();var c=lockContact(req.contactId());var old=new PatientServiceEntryExample();old.eq("hospital_id",c.hospitalId).eq("contact_id",c.id).ne("status","REVOKED");
  for(var e:entries.selectByExample(old)){var patch=new PatientServiceEntry();patch.status="REVOKED";patch.version=e.version+1;patch.modifier=CurrentAccount.get().userId().toString();var ex=new PatientServiceEntryExample();ex.eq("id",e.id).eq("version",e.version);Checks.conflict(entries.updateByExampleSelective(patch,ex)==1);}
  byte[] bytes=new byte[32];new SecureRandom().nextBytes(bytes);String token=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  var e=new PatientServiceEntry();e.hospitalId=c.hospitalId;e.contactId=c.id;e.tokenHash=hash(token);e.status="ISSUED";e.expiresAt=LocalDateTime.now().plusDays(7).withNano(0);e.version=0;e.creator=CurrentAccount.get().userId().toString();entries.insertSelective(e);
  audit.append(c.patientId>0?c.patientId:null,"PATIENT_ENTRY_ISSUED",e.id,null,e.status,"contact="+c.id);
  return new ServiceEntryIssuedResponse(e.id,token,"/service#"+token,e.expiresAt,Boolean.TRUE.equals(c.mock));
 }
 public Paged<ServiceEntryResponse> query(ServiceEntryQueryRequest req){
  access.operations();var ex=new PatientServiceEntryExample();ex.eq("hospital_id",CurrentAccount.get().hospitalId());if(req.status()!=null)ex.eq("status",req.status());
  // Filter in SQL using the same patient/member scope as the existing WeCom contact module.
  
  if(access.executor()) { var ids=new ArrayList<Long>();var mine=new WechatContactExample();mine.eq("hospital_id",CurrentAccount.get().hospitalId()).eq("channel","WE_COM").eq("patient_id",0L).eq("staff_account_id",CurrentAccount.get().userId());ids.addAll(contacts.selectByExample(mine).stream().map(c->c.id).toList());var bound=new WechatContactExample();bound.eq("hospital_id",CurrentAccount.get().hospitalId()).eq("channel","WE_COM").in("patient_id",access.scopedPatientIds(10000));ids.addAll(contacts.selectByExample(bound).stream().map(c->c.id).toList());ex.in("contact_id",ids); }
  ex.setOrderByClause("id DESC");PageHelper.startPage(Paged.number(req.page()),Paged.size(req.size()));var rows=entries.selectByExample(ex);return Paged.of(rows,this::view);
 }
 private ServiceEntryResponse view(PatientServiceEntry e){var c=contacts.selectByPrimaryKey(e.contactId);return new ServiceEntryResponse(e.id,e.contactId,c==null?null:c.nickname,e.status,e.patientName,e.phone,e.relation,e.entryPhase,e.patientId,e.identityEvidence,e.consentAt,e.expiresAt,e.version);}
 @Transactional
 public ServiceEntryResponse verify(ServiceEntryVerifyRequest req){
  access.operations();var p=access.lock(req.patientId());var initial=entries.selectByPrimaryKey(req.id());Checks.found(initial!=null&&CurrentAccount.get().hospitalId().equals(initial.hospitalId));var c=lockContact(initial.contactId);var e=lockEntry(req.id());
  Checks.conflict(Objects.equals(req.version(),e.version)&&"REGISTERED".equals(e.status));Checks.require(e.expiresAt.isAfter(LocalDateTime.now()),"服务链接已过期，请重新签发");
  Checks.require(e.consentAt!=null&&authorization.active(p)&&p.ownerId!=null&&p.doctorId!=null&&!List.of("PAUSED","CLOSED").contains(p.lifecycle),"请先在患者档案中核实服务授权并分派负责人、责任医生");
  Checks.require(c.patientId==0||c.patientId.equals(p.id),"联系人已绑定其他患者，请先核实解绑");if(c.patientId==0)ledger.bind(c.id,c.version,p.id);
  var patch=new PatientServiceEntry();patch.patientId=p.id;patch.identityEvidence=req.evidence().trim();patch.status="VERIFIED";patch.version=e.version+1;patch.modifier=CurrentAccount.get().userId().toString();var ex=new PatientServiceEntryExample();ex.eq("id",e.id).eq("version",e.version);Checks.conflict(entries.updateByExampleSelective(patch,ex)==1);
  audit.append(p.id,"PATIENT_ENTRY_VERIFIED",e.id,e.status,"VERIFIED",req.evidence());return view(entries.selectByPrimaryKey(e.id));
 }
 @Transactional
 public ServiceEntryResponse revoke(ServiceEntryRevokeRequest req){access.operations();var initial=entries.selectByPrimaryKey(req.id());Checks.found(initial!=null&&CurrentAccount.get().hospitalId().equals(initial.hospitalId));lockContact(initial.contactId);var e=lockEntry(req.id());Checks.conflict(Objects.equals(e.version,req.version())&&!"REVOKED".equals(e.status));var patch=new PatientServiceEntry();patch.status="REVOKED";patch.version=e.version+1;patch.modifier=CurrentAccount.get().userId().toString();var ex=new PatientServiceEntryExample();ex.eq("id",e.id).eq("version",e.version);Checks.conflict(entries.updateByExampleSelective(patch,ex)==1);audit.append(e.patientId,"PATIENT_ENTRY_REVOKED",e.id,e.status,"REVOKED",req.reason());return view(entries.selectByPrimaryKey(e.id));}
 private PatientServiceEntry token(String token,boolean lock){
  Checks.require(token!=null&&token.matches("[A-Za-z0-9_-]{43}"),"服务链接无效");var ex=new PatientServiceEntryExample();ex.eq("token_hash",hash(token));ex.setForUpdate(lock);var rows=entries.selectByExample(ex);Checks.found(!rows.isEmpty());var e=rows.getFirst();
  Checks.require(!"REVOKED".equals(e.status)&&e.expiresAt.isAfter(LocalDateTime.now()),"服务链接已失效，请联系医院服务人员重新发送");
  var c=contacts.selectByPrimaryKey(e.contactId);Checks.require(c!=null&&Objects.equals(c.hospitalId,e.hospitalId)&&"WE_COM".equals(c.channel)&&"ACTIVE".equals(c.relation),"企微联系关系已失效，请联系服务团队");
  if("VERIFIED".equals(e.status)){Checks.require(Objects.equals(c.patientId,e.patientId),"患者绑定已变化，请重新核实");patient(e);}
  return e;
 }
 private Patient patient(PatientServiceEntry e){var p=patients.selectByPrimaryKey(e.patientId);Checks.require(p!=null&&e.hospitalId.equals(p.hospitalId)&&authorization.active(p)&&!List.of("PAUSED","CLOSED").contains(p.lifecycle),"患者服务已暂停或授权已撤回，请联系服务人员");return p;}
 @Transactional
 public PatientPortalResponse register(PatientEntryRegisterRequest req){
  var e=token(req.token(),true);Checks.require(Boolean.TRUE.equals(req.consent()),"请确认服务授权");
  if(!"ISSUED".equals(e.status)){Checks.conflict(Objects.equals(e.patientName,req.patientName().trim())&&Objects.equals(e.phone,req.phone())&&Objects.equals(e.relation,req.relation())&&Objects.equals(e.entryPhase,req.entryPhase()));return portal(e);}
  var patch=new PatientServiceEntry();patch.patientName=req.patientName().trim();patch.phone=req.phone();patch.relation=req.relation();patch.entryPhase=req.entryPhase();patch.consentVersion=CONSENT_VERSION;patch.consentAt=LocalDateTime.now().withNano(0);patch.status="REGISTERED";patch.version=e.version+1;patch.modifier="patient-h5";var ex=new PatientServiceEntryExample();ex.eq("id",e.id).eq("version",e.version);Checks.conflict(entries.updateByExampleSelective(patch,ex)==1);
  audit.appendSystem(e.hospitalId,null,"PATIENT_ENTRY_REGISTERED",e.id,"ISSUED","REGISTERED","consent="+CONSENT_VERSION+"; relation="+req.relation());return portal(entries.selectByPrimaryKey(e.id));
 }
 public PatientPortalResponse portal(PatientEntryAccessRequest req){return portal(token(req.token(),false));}
 private static String step(ServiceJourney j){var path="OUTPATIENT".equals(j.kind)?List.of("交接接单","诊前咨询与预约","实际到院核验","诊中服务","报告核对","个案计划审核","诊后随访","复诊与结案"):List.of("交接接单","住院服务","出院报告核对","出院交接","个案计划审核","诊后随访","复诊与结案");return j.stage>=path.size()?"已结束":path.get(j.stage);}
 private static String phase(ServiceJourney j){if("OUTPATIENT".equals(j.kind))return j.stage<=2?"诊前":j.stage<=4?"诊中":"诊后";return j.stage<=2?"诊中":"诊后";}
 private PatientPortalResponse portal(PatientServiceEntry e){
  var c=contacts.selectByPrimaryKey(e.contactId);if(!"VERIFIED".equals(e.status))return new PatientPortalResponse(e.status,e.patientName==null?null:PatientService.maskName(e.patientName),e.consentVersion,Boolean.TRUE.equals(c.mock),List.of(),List.of());
  var p=patient(e);var ex=new ServiceJourneyExample();ex.eq("hospital_id",e.hospitalId).eq("patient_id",p.id);ex.setOrderByClause("id DESC");PageHelper.startPage(1,50,false);var js=journeys.selectByExample(ex).stream().map(j->new PatientPortalResponse.Journey(j.id,j.kind,j.status,phase(j),step(j),j.eventAt)).toList();
  var fe=new PatientServiceFeedbackExample();fe.eq("entry_id",e.id).eq("hospital_id",e.hospitalId);fe.setOrderByClause("id DESC");PageHelper.startPage(1,50,false);var fs=feedback.selectByExample(fe).stream().map(f->{var fc=cases.selectByPrimaryKey(f.caseId);return new PatientPortalResponse.Feedback(f.id,f.journeyId,f.kind,f.content,fc==null?"OPEN":fc.status,f.gmtCreate);}).toList();
  return new PatientPortalResponse("VERIFIED",PatientService.maskName(p.name),e.consentVersion,Boolean.TRUE.equals(c.mock),js,fs);
 }
 @Transactional
 public PatientPortalResponse feedback(PatientEntryFeedbackRequest req){
  // Lock patient first, then entry and journey, matching staff verification/closure lock order.
  var initial=token(req.token(),false);Checks.require("VERIFIED".equals(initial.status),"请等待工作人员核实身份");var pe=new PatientExample();pe.eq("id",initial.patientId).eq("hospital_id",initial.hospitalId);pe.setForUpdate(true);Checks.found(!patients.selectByExample(pe).isEmpty());var e=token(req.token(),true);
  var je=new ServiceJourneyExample();je.eq("id",req.journeyId()).eq("hospital_id",e.hospitalId).eq("patient_id",e.patientId);je.setForUpdate(true);var rows=journeys.selectByExample(je);Checks.found(!rows.isEmpty());var j=rows.getFirst();
  String fingerprint=hash(req.journeyId()+"\n"+req.kind()+"\n"+req.content().trim());var fe=new PatientServiceFeedbackExample();fe.eq("entry_id",e.id).eq("request_id",req.requestId());var prior=feedback.selectByExample(fe);if(!prior.isEmpty()){Checks.conflict(fingerprint.equals(prior.getFirst().payloadHash));return portal(e);}
  Checks.require("ACTIVE".equals(j.status),"本次旅程未开放服务，请联系服务人员");var p=patient(e);Checks.require(p.ownerId!=null&&p.doctorId!=null,"请等待服务团队完成分派");
  var c=new JourneyCase();c.hospitalId=e.hospitalId;c.patientId=e.patientId;c.journeyId=j.id;c.kind=req.kind();c.status="OPEN";c.summary=req.content().trim();c.dueAt=LocalDateTime.now().plusHours(24).withNano(0);c.ownerId=p.ownerId;c.doctorId=p.doctorId;c.version=0;c.creator="patient-h5";cases.insertSelective(c);
  var patch=new ServiceJourney();patch.version=j.version+1;patch.modifier="patient-h5";var update=new ServiceJourneyExample();update.eq("id",j.id).eq("version",j.version);Checks.conflict(journeys.updateByExampleSelective(patch,update)==1);
  var f=new PatientServiceFeedback();f.hospitalId=e.hospitalId;f.entryId=e.id;f.patientId=e.patientId;f.journeyId=j.id;f.caseId=c.id;f.requestId=req.requestId();f.kind=req.kind();f.content=req.content().trim();f.payloadHash=fingerprint;f.creator="patient-h5";feedback.insertSelective(f);
  audit.appendSystem(e.hospitalId,e.patientId,"PATIENT_FEEDBACK_CREATED",c.id,null,"OPEN","journey="+j.id+"; kind="+req.kind());return portal(e);
 }
}
