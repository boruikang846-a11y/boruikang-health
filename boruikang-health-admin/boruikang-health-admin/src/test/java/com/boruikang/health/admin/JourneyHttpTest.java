package com.boruikang.health.admin;

import com.fasterxml.jackson.databind.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.*;
import org.springframework.boot.test.context.SpringBootTest;
import java.net.URI;
import java.net.http.*;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={"spring.datasource.url=jdbc:h2:mem:journey-tests;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1","logging.level.root=WARN"})
@org.junit.jupiter.api.TestInstance(org.junit.jupiter.api.TestInstance.Lifecycle.PER_CLASS)
class JourneyHttpTest {
 final Map<String,String> tokens=new HashMap<>();
 @Value("${local.server.port}") int port;
 @Autowired ObjectMapper json;
 @Autowired com.boruikang.health.mapper.JourneyCaseMapper caseMapper;
 @Autowired com.boruikang.health.mapper.WechatContactMapper contactMapper;
 @Autowired com.boruikang.health.servicecenter.service.PatientServiceCenter patientPortal;
 final HttpClient http=HttpClient.newHttpClient();
 String key(){return UUID.randomUUID().toString();}
 String at(int days){return LocalDateTime.now().minusDays(days).withNano(0).toString();}
 Map<String,Object> map(Object... pairs){Map<String,Object> m=new HashMap<>();for(int i=0;i<pairs.length;i+=2)m.put((String)pairs[i],pairs[i+1]);return m;}
 HttpResponse<String> request(String path,Object body,String token)throws Exception {
  var b=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/boruikang/admin"+path)).header("Content-Type","application/json");if(token!=null)b.header("Jwttoken",token);
  return http.send(b.POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body))).build(),HttpResponse.BodyHandlers.ofString());
 }
 JsonNode ok(String path,Object body,String token)throws Exception{var r=request(path,body,token);assertEquals(200,r.statusCode(),r.body());return json.readTree(r.body()).path("result");}
 String login(String user)throws Exception{if(tokens.containsKey(user))return tokens.get(user);String token=ok("/login",map("identifier",user,"password","HealthDemo@2026!"),null).path("jwt_token").asText();tokens.put(user,token);return token;}
 long patient(String manager)throws Exception {
  var p=ok("/patients/create",map("name","虚构旅程对象-"+key(),"gender","FEMALE","age",52,"phone","00000000031","department","全科","disease","虚构管理原因","doctor_id",2,"owner_id",6,"outreach",false),manager);
  ok("/patients/consent",map("id",p.path("id").asLong(),"version",p.path("version").asInt(),"consent_at",at(0),"consent_version","DEMO-2","consent_evidence","虚构服务授权核验"),manager);return p.path("id").asLong();
 }
 Map<String,Object> command(JsonNode j){return map("id",j.path("id").asLong(),"version",j.path("version").asInt(),"request_id",key(),"evidence","虚构节点人工核验依据");}
 JsonNode start(long p,String kind,String phase,String manager,String nurse)throws Exception {
  var j=ok("/journeys/create",map("patient_id",p,"kind",kind,"entry_phase",phase,"source_system","MANUAL","event_key",key(),"event_at",at(10),"identity_evidence","虚构身份核验","handoff_evidence","虚构事项与后续安排","request_id",key()),manager);
  assertEquals("INTAKE",j.path("status").asText());assertEquals(403,request("/journeys/handoff_accept",command(j),manager).statusCode());
  return ok("/journeys/handoff_accept",command(j),nurse);
 }
 JsonNode step(JsonNode j,String nurse,Object... extra)throws Exception {var body=command(j);body.put("step_code",j.path("current_step").asText());body.put("occurred_at",at(0));for(int i=0;i<extra.length;i+=2)body.put((String)extra[i],extra[i+1]);return ok("/journeys/step",body,nurse);}
 long appointment(long p,String kind,int days,String manager)throws Exception {
  var a=ok("/appointments/create",map("patient_id",p,"appointment_type",kind,"channel","STAFF_BOOKED","appointment_at",at(-1),"department","全科","evidence","虚构院内核验","request_key",key()),manager);
  a=ok("/appointments/transition",map("id",a.path("id").asLong(),"version",a.path("version").asInt(),"action","ARRIVE","at",at(days),"evidence","虚构实际到院凭证"),manager);
  if(kind.equals("REVISIT"))a=ok("/appointments/transition",map("id",a.path("id").asLong(),"version",a.path("version").asInt(),"action","COMPLETE","at",at(days),"outcome","OUTPATIENT_TREATED","outcome_note","虚构复诊结果核验"),manager);
  return a.path("id").asLong();
 }
 JsonNode ready(long p,String kind,String phase,String m,String n,String d)throws Exception {
  JsonNode j=start(p,kind,phase,m,n);
  if(phase.equals("FULL")) {
   if(kind.equals("OUTPATIENT")){j=step(j,n);long a=appointment(p,"OUTPATIENT",5,m);assertEquals(400,request("/journeys/step",map("id",j.path("id").asLong(),"version",j.path("version").asInt(),"request_id",key(),"step_code","ARRIVAL","occurred_at",at(0),"evidence","仅预约不足"),n).statusCode());j=step(j,n,"appointment_id",a);}
   j=step(j,n);
  }
  long record=ok("/records/create",map("patient_id",p,"record_type",kind,"occurred_at",at(3),"content","虚构本次事件原报告，仅测试，无临床建议"),m).path("id").asLong();
  var clinical=command(j);clinical.putAll(map("step_code","CLINICAL","occurred_at",at(0),"record_id",record));
  assertEquals(403,request("/journeys/step",clinical,n).statusCode());assertEquals(400,request("/journeys/step",clinical,d).statusCode());
  ok("/records/review",map("id",record,"opinion","本人核对虚构报告"),d);j=ok("/journeys/step",clinical,d);
  if(kind.equals("DISCHARGE"))j=step(j,n);
  assertEquals("PLAN",j.path("current_step").asText());return j;
 }
 JsonNode draft(JsonNode j,String n)throws Exception {
  var body=command(j);body.put("plan_text","本次事件个案服务计划，虚构内容待医生审核");body.put("nodes",List.of(map("seq",1,"stage","D3","offset_days",3,"task_type","FOLLOWUP","title","虚构事件随访","priority","P2","checklist","核对当前报告与收集反馈，虚构验收内容")));
  return ok("/journeys/plan_draft",body,n);
 }
 JsonNode approve(JsonNode j,String d)throws Exception {var body=command(j);body.putAll(map("plan_id",j.path("current_plan_id").asLong(),"approved",true,"review_note","责任医生本人核对本次报告与全部节点"));return ok("/journeys/plan_review",body,d);}
 JsonNode finishFollowups(JsonNode j,String n,String d)throws Exception {
  for(var linked:j.path("tasks")) {JsonNode task=ok("/tasks/query",map("page",0,"size",10,"patient_id",j.path("patient_id").asLong()),n).path("items");JsonNode t=null;for(var x:task)if(x.path("id").asLong()==linked.path("task_id").asLong())t=x;assertNotNull(t);
   t=ok("/tasks/contact",map("id",t.path("id").asLong(),"version",t.path("version").asInt(),"evidence","虚构实际人工联系证据","contact_at",at(0),"method","PHONE","identity_verified",true,"recipient_role","PATIENT","report_reviewed",true,"medication_feedback","虚构反馈，无新医学建议","patient_questions","无"),n);
   t=ok("/tasks/transition",map("id",t.path("id").asLong(),"version",t.path("version").asInt(),"action","COMPLETE","outcome","虚构反馈已记录"),n);
   assertEquals(400,request("/journeys/step",map("id",j.path("id").asLong(),"version",j.path("version").asInt(),"request_id",key(),"step_code","FOLLOWUP","occurred_at",at(0),"evidence","缺少医生查收"),n).statusCode());
   ok("/tasks/acknowledge",map("id",t.path("id").asLong(),"version",t.path("version").asInt(),"feedback","责任医生本人已查收虚构结果"),d);
  }return step(j,n);
 }
 @Test void bothEventJourneysReachEvidenceBasedClosure()throws Exception {
  String m=login("manager"),n=login("nurse"),d=login("doctor");
  for(String kind:List.of("OUTPATIENT","DISCHARGE")) {
   long p=patient(m);JsonNode j=ready(p,kind,"FULL",m,n,d);j=draft(j,n);
   var review=command(j);review.putAll(map("plan_id",j.path("current_plan_id").asLong(),"approved",true,"review_note","不能代审"));assertEquals(403,request("/journeys/plan_review",review,m).statusCode());
   j=approve(j,d);assertEquals(1,j.path("tasks").size());assertEquals("FOLLOWUP",j.path("current_step").asText());j=finishFollowups(j,n,d);
   long a=appointment(p,"REVISIT",1,m);j=step(j,n,"outcome","VERIFIED","appointment_id",a,"satisfaction_status","RATED","satisfaction_score",5);
   assertEquals("CLOSED",j.path("status").asText());assertTrue(j.path("results").size()>=7);assertEquals(409,request("/journeys/step",map("id",j.path("id").asLong(),"version",j.path("version").asInt(),"request_id",key(),"step_code","CLOSE","occurred_at",at(0),"evidence","终态不可推进"),n).statusCode());
  }
 }
 @Test void commandsAreScopedIdempotentAndVersioned()throws Exception {
  String m=login("manager"),n=login("nurse");long p=patient(m);var body=map("patient_id",p,"kind","DISCHARGE","entry_phase","FULL","source_system","MANUAL","event_key",key(),"event_at",at(5),"identity_evidence","虚构核验","handoff_evidence","虚构交接","request_id",key());
  JsonNode first=ok("/journeys/create",body,m),retry=ok("/journeys/create",body,m);assertEquals(first,retry);
  body.put("event_key",key());assertEquals(409,request("/journeys/create",body,m).statusCode());
  assertEquals(403,request("/journeys/query",map("page",0,"size",10),login("platform")).statusCode());
  assertEquals(404,request("/journeys/detail",map("id",first.path("id").asLong()),login("operator_a")).statusCode());
  assertEquals(401,request("/journeys/detail",map("id",first.path("id").asLong()),null).statusCode());
  JsonNode active=ok("/journeys/handoff_accept",command(first),n);var a=command(active);a.putAll(map("step_code","IN_HOSPITAL","occurred_at",at(0)));var b=new HashMap<>(a);b.put("request_id",key());
  var pool=Executors.newFixedThreadPool(2);try {var responses=pool.invokeAll(List.of(()->request("/journeys/step",a,n).statusCode(),()->request("/journeys/step",b,n).statusCode()));var codes=List.of(responses.get(0).get(),responses.get(1).get());assertTrue(codes.contains(200));assertTrue(codes.contains(409));}finally{pool.shutdown();}
 }
 @Test void pauseReplacementAndExitPreventOldTaskExecution()throws Exception {
  String m=login("manager"),n=login("nurse"),d=login("doctor");JsonNode j=approve(draft(ready(patient(m),"DISCHARGE","AFTER_CARE",m,n,d),n),d);long old=j.path("tasks").get(0).path("task_id").asLong();
  var pause=command(j);pause.put("action","PAUSE");j=ok("/journeys/status",pause,n);
  assertEquals(400,request("/tasks/contact",map("id",old,"version",0,"evidence","虚构联系","contact_at",at(0),"method","PHONE","identity_verified",true,"recipient_role","PATIENT","report_reviewed",true,"medication_feedback","无","patient_questions","无"),n).statusCode());
  var resume=command(j);resume.put("action","RESUME");j=ok("/journeys/status",resume,n);j=draft(j,n);j=approve(j,d);assertNotEquals(old,j.path("tasks").get(0).path("task_id").asLong());
  var tasks=ok("/tasks/query",map("patient_id",j.path("patient_id").asLong(),"page",0,"size",10),n).path("items");for(var t:tasks)if(t.path("id").asLong()==old)assertEquals("CANCELLED",t.path("status").asText());
  var exit=command(j);exit.put("action","EXIT");j=ok("/journeys/status",exit,n);assertEquals("EXITED",j.path("status").asText());assertEquals(409,request("/journeys/status",map("id",j.path("id").asLong(),"version",j.path("version").asInt(),"request_id",key(),"action","RESUME","evidence","退出不可恢复"),n).statusCode());
 }
 @Test void clinicalCaseNeedsDoctorResolutionAndPatientReceipt()throws Exception {
  String m=login("manager"),n=login("nurse"),d=login("doctor");JsonNode j=approve(draft(ready(patient(m),"DISCHARGE","AFTER_CARE",m,n,d),n),d);j=finishFollowups(j,n,d);
  var open=command(j);open.putAll(map("kind","CLINICAL","summary","虚构异常原始反馈","due_at",LocalDateTime.now().plusHours(2).withNano(0).toString()));j=ok("/journeys/case_open",open,n);long c=j.path("cases").get(0).path("id").asLong();
  var none=command(j);none.put("reason","当前个案本轮无需复诊，虚构判定依据");j=ok("/journeys/no_revisit",none,d);
  var close=command(j);close.putAll(map("step_code","CLOSE","occurred_at",at(0),"outcome","NONE","satisfaction_status","NO_RESPONSE"));assertEquals(400,request("/journeys/step",close,n).statusCode());
  var resolve=command(j);resolve.putAll(map("case_id",c,"action","RESOLVE"));assertEquals(403,request("/journeys/case_action",resolve,n).statusCode());
  var accept=command(j);accept.putAll(map("case_id",c,"action","ACCEPT"));j=ok("/journeys/case_action",accept,d);
  resolve=command(j);resolve.putAll(map("case_id",c,"action","RESOLVE"));j=ok("/journeys/case_action",resolve,d);
  close=command(j);close.putAll(map("step_code","CLOSE","occurred_at",at(0),"outcome","NONE","satisfaction_status","NO_RESPONSE"));assertEquals(400,request("/journeys/step",close,n).statusCode());
  var receipt=command(j);receipt.putAll(map("case_id",c,"action","CLOSE"));j=ok("/journeys/case_action",receipt,n);j=step(j,n,"outcome","NONE","satisfaction_status","NO_RESPONSE");assertEquals("CLOSED",j.path("status").asText());
 }
 @Test void priorReportRemainsBoundAfterPlanRevision()throws Exception {
  String m=login("manager"),n=login("nurse"),d=login("doctor");long p=patient(m);JsonNode j=approve(draft(ready(p,"DISCHARGE","AFTER_CARE",m,n,d),n),d);long original=j.path("record_id").asLong();
  long newer=ok("/records/create",map("patient_id",p,"record_type","DISCHARGE","occurred_at",at(2),"content","虚构更新后的本次报告"),m).path("id").asLong();ok("/records/review",map("id",newer,"opinion","责任医生核对更新依据"),d);
  var proposed=command(j);proposed.putAll(map("record_id",newer,"plan_text","虚构更新个案计划","nodes",List.of(map("seq",1,"stage","D3","offset_days",3,"task_type","FOLLOWUP","title","更新后节点","priority","P2","checklist","虚构更新待审核内容"))));j=ok("/journeys/plan_draft",proposed,n);
  JsonNode other=start(p,"DISCHARGE","AFTER_CARE",m,n);var borrowed=command(other);borrowed.putAll(map("step_code","CLINICAL","occurred_at",at(0),"record_id",original));assertEquals(400,request("/journeys/step",borrowed,d).statusCode(),"historical clinical evidence cannot be moved to another event");
 }
 @Test void declinedPlansDoNotGenerateTasksAndLateEntryIsExplicit()throws Exception {
  String m=login("manager"),n=login("nurse"),d=login("doctor");JsonNode j=draft(ready(patient(m),"OUTPATIENT","AFTER_CARE",m,n,d),n);assertEquals("AFTER_CARE",j.path("entry_phase").asText());assertEquals(0,j.path("tasks").size());
  var reject=command(j);reject.putAll(map("plan_id",j.path("current_plan_id").asLong(),"approved",false,"review_note","虚构内容需修改"));j=ok("/journeys/plan_review",reject,d);assertEquals("REJECTED",j.path("plans").get(0).path("status").asText());assertEquals(0,j.path("tasks").size());j=approve(draft(j,n),d);assertEquals(1,j.path("tasks").size());assertEquals(2,j.path("plans").size());
  var queried=ok("/journeys/query",map("page",0,"size",10,"patient_id",j.path("patient_id").asLong()),n);assertEquals(1,queried.path("total_size").asInt());
 }

 @Test void reassignmentRequiresNewOwnerReceiptAndMovesOpenTasks()throws Exception {
  String m=login("manager"),n=login("nurse"),d=login("doctor"),operator=login("operator_a");long p=patient(m);JsonNode j=approve(draft(ready(p,"DISCHARGE","AFTER_CARE",m,n,d),n),d);long task=j.path("tasks").get(0).path("task_id").asLong();
  var profile=http.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/boruikang/admin/patients/"+p)).header("Jwttoken",m).GET().build(),HttpResponse.BodyHandlers.ofString());var pr=json.readTree(profile.body()).path("result");
  ok("/patients/update",map("id",p,"version",pr.path("version").asInt(),"owner_id",3),m);
  var handoff=command(j);handoff.put("action","HANDOFF");j=ok("/journeys/status",handoff,m);assertEquals(3,j.path("owner_id").asLong(),"new recipient must be visible before acceptance");
  j=ok("/journeys/handoff_accept",command(j),operator);
  var rows=ok("/tasks/query",map("patient_id",p,"page",0,"size",10),operator).path("items");for(var t:rows)if(t.path("id").asLong()==task)assertEquals(3,t.path("assignee_id").asLong());
  assertEquals(404,request("/journeys/detail",map("id",j.path("id").asLong()),n).statusCode());
 }

 @Test void journeyDeepLinksServeAdminSpaWithoutMaskingUnknownApi()throws Exception {
  for(String path:List.of("/journeys","/journeys/99999","/after-care")) {var r=http.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+path)).GET().build(),HttpResponse.BodyHandlers.ofString());assertEquals(200,r.statusCode());assertTrue(r.body().contains("/assets/"));}
  assertEquals(404,request("/journeys/missing",map(),login("manager")).statusCode());
 }

 @Test void interventionWorkbenchShowsScopedOverdueCases()throws Exception {
  String m=login("manager"),n=login("nurse"),d=login("doctor");JsonNode j=start(patient(m),"DISCHARGE","AFTER_CARE",m,n);var body=command(j);body.putAll(map("kind","CLINICAL","summary","虚构待接单问题","due_at",LocalDateTime.now().plusHours(2).withNano(0).toString()));j=ok("/journeys/case_open",body,n);
  var rows=ok("/journeys/cases_query",map("patient_id",j.path("patient_id").asLong(),"page",0,"size",10,"kind","CLINICAL"),d);assertEquals(1,rows.path("total_size").asInt());assertEquals(j.path("id").asLong(),rows.path("items").get(0).path("journey_id").asLong());
  assertEquals(0,ok("/journeys/cases_query",map("page",0,"size",10),login("operator_a")).path("total_size").asInt());
  var summary=ok("/journeys/summary",map("patient_id",j.path("patient_id").asLong()),n);assertEquals(1,summary.path("active_count").asInt());assertEquals(1,summary.path("open_case_count").asInt());assertEquals(0,summary.path("overdue_case_count").asInt());
  var expired=new com.boruikang.health.model.JourneyCase();expired.dueAt=LocalDateTime.now().minusHours(1);var example=new com.boruikang.health.model.JourneyCaseExample();example.eq("id",j.path("cases").get(0).path("id").asLong());caseMapper.updateByExampleSelective(expired,example);
  assertEquals(1,ok("/journeys/cases_query",map("patient_id",j.path("patient_id").asLong(),"page",0,"size",10,"overdue",true),d).path("total_size").asInt());assertEquals(1,ok("/journeys/summary",map("patient_id",j.path("patient_id").asLong()),n).path("overdue_case_count").asInt());
  assertEquals(403,request("/journeys/summary",map(),login("platform")).statusCode());
 }

 @Test void withdrawingServiceAuthorizationStopsAllPatientJourneysUntilNewConsent()throws Exception {
  String m=login("manager"),n=login("nurse"),d=login("doctor");long p=patient(m);JsonNode first=approve(draft(ready(p,"DISCHARGE","AFTER_CARE",m,n,d),n),d),second=start(p,"OUTPATIENT","AFTER_CARE",m,n);long secondId=second.path("id").asLong();var body=command(first);body.put("action","WITHDRAW");first=ok("/journeys/status",body,n);assertEquals("EXITED",first.path("status").asText());assertFalse(first.path("service_authorization_active").asBoolean());
  assertEquals("EXITED",ok("/journeys/detail",map("id",secondId),n).path("status").asText());var create=map("patient_id",p,"kind","DISCHARGE","entry_phase","AFTER_CARE","source_system","MANUAL","event_key",key(),"event_at",at(0),"identity_evidence","虚构身份","handoff_evidence","虚构交接","request_id",key());assertEquals(400,request("/journeys/create",create,n).statusCode());
  var profile=http.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/boruikang/admin/patients/"+p)).header("Jwttoken",m).GET().build(),HttpResponse.BodyHandlers.ofString());var pr=json.readTree(profile.body()).path("result");ok("/patients/consent",map("id",p,"version",pr.path("version").asInt(),"consent_at",at(0),"consent_version","DEMO-NEW","consent_evidence","虚构重新取得本用途服务授权"),m);assertEquals("INTAKE",ok("/journeys/create",create,n).path("status").asText());assertEquals("EXITED",ok("/journeys/detail",map("id",secondId),n).path("status").asText(),"new consent never silently resumes old journeys");
 }


 @Test void continuousPlanSurvivesCompleteEvidenceBasedJourneyAndRejectsConcurrentOverwrite()throws Exception {
  String m=login("manager"),n=login("nurse"),d=login("doctor");long p=patient(m);
  var contact=new com.boruikang.health.model.WechatContact();contact.hospitalId=1L;contact.channel="WE_COM";contact.externalId=key();contact.nickname="虚构完整案例联系人";contact.patientId=0L;contact.staffAccountId=6L;contact.relation="ACTIVE";contact.pendingCount=0;contact.version=0;contact.mock=true;contact.creator="test";contactMapper.insertSelective(contact);
  var invitation=ok("/service_center/issue",map("contact_id",contact.id),n);String inviteToken=invitation.path("token").asText();
  patientPortal.register(new com.boruikang.health.servicecenter.dto.PatientEntryRegisterRequest(inviteToken,"虚构受邀患者","00000000031","SELF","AFTER_CARE",true));
  ok("/service_center/verify",map("id",invitation.path("id").asLong(),"version",1,"patient_id",p,"evidence","虚构身份授权及代办核实"),n);
  var plan=ok("/continuity/save",map("patient_id",p,"baseline","虚构基线","goals","虚构房颤管理目标，医师确认","patient_instructions","按个案安排接受服务","next_review_date",java.time.LocalDate.now().plusDays(20).toString(),"evidence","虚构核对资料"),n);
  assertEquals(403,request("/continuity/approve",map("id",plan.path("id").asLong(),"version",0,"approve",true,"evidence","不可代审"),n).statusCode());
  JsonNode j=approve(draft(ready(p,"DISCHARGE","AFTER_CARE",m,n,d),n),d);
  plan=ok("/continuity/link",map("id",plan.path("id").asLong(),"version",plan.path("version").asInt(),"journey_id",j.path("id").asLong(),"evidence","关联本次就医"),n);
  plan=ok("/continuity/approve",map("id",plan.path("id").asLong(),"version",plan.path("version").asInt(),"approve",true,"evidence","医生本人审核长期安排"),d);
  var portalAccess=new com.boruikang.health.servicecenter.dto.PatientEntryAccessRequest(inviteToken);
  assertEquals(1,patientPortal.portal(portalAccess).continuousPlans().size());
  var patientFeedback=new com.boruikang.health.servicecenter.dto.PatientEntryFeedbackRequest(inviteToken,j.path("id").asLong(),key(),"CLINICAL","虚构患者阶段反馈");
  patientPortal.feedback(patientFeedback);patientPortal.feedback(patientFeedback);
  j=ok("/journeys/detail",map("id",j.path("id").asLong()),n);long caseId=j.path("cases").get(0).path("id").asLong();
  var accept=command(j);accept.putAll(map("case_id",caseId,"action","ACCEPT"));j=ok("/journeys/case_action",accept,d);
  var resolve=command(j);resolve.putAll(map("case_id",caseId,"action","RESOLVE"));j=ok("/journeys/case_action",resolve,d);
  var f=ok("/service_center/feedback_query",map("patient_id",p),d).get(0);
  ok("/service_center/feedback_reply",map("id",f.path("id").asLong(),"case_version",f.path("case_version").asInt(),"patient_reply","责任医生已处理，请按个案安排复诊"),d);
  assertEquals("责任医生已处理，请按个案安排复诊",patientPortal.portal(portalAccess).feedback().getFirst().patientReply());
  var receipt=command(j);receipt.putAll(map("case_id",caseId,"action","CLOSE"));j=ok("/journeys/case_action",receipt,n);
  j=finishFollowups(j,n,d);long a=appointment(p,"REVISIT",1,m);j=step(j,n,"outcome","VERIFIED","appointment_id",a,"satisfaction_status","RATED","satisfaction_score",5);assertEquals("CLOSED",j.path("status").asText());
  var summary=ok("/continuity/summary",map("patient_id",p),n);assertEquals("ACTIVE",summary.path("plans").get(0).path("status").asText());assertTrue(summary.path("latest_report").path("reviewed").asBoolean());
  var body=map("id",plan.path("id").asLong(),"version",plan.path("version").asInt(),"journey_id",j.path("id").asLong(),"summary","完成复诊后的阶段评价","evidence","虚构独立复诊证据","patient_message","继续按确认后的个案安排服务","assessment","UNKNOWN","next_review_date",java.time.LocalDate.now().plusDays(40).toString());
  var pool=Executors.newFixedThreadPool(2);try{var results=pool.invokeAll(List.of(()->request("/continuity/review",body,d).statusCode(),()->request("/continuity/review",body,d).statusCode()));var codes=List.of(results.get(0).get(),results.get(1).get());assertTrue(codes.contains(200));assertTrue(codes.contains(409));}finally{pool.shutdown();}
  assertEquals(404,request("/continuity/summary",map("patient_id",p),login("operator_a")).statusCode());
  assertEquals(403,request("/continuity/summary",map("patient_id",p),login("platform")).statusCode());
  JsonNode second=start(p,"OUTPATIENT","AFTER_CARE",m,n);plan=ok("/continuity/query",map("patient_id",p),n).get(0);
  plan=ok("/continuity/link",map("id",plan.path("id").asLong(),"version",plan.path("version").asInt(),"journey_id",second.path("id").asLong(),"evidence","再次就医沿用长期计划"),n);
  assertEquals(2,plan.path("journey_ids").size());assertEquals(2,patientPortal.portal(portalAccess).journeys().size());
  assertEquals("CLOSED",patientPortal.portal(portalAccess).feedback().getFirst().status());
 }
}
