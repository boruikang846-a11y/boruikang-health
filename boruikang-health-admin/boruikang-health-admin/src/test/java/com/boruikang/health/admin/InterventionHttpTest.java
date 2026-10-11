package com.boruikang.health.admin;
import com.fasterxml.jackson.databind.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.*;
import org.springframework.boot.test.context.SpringBootTest;
import java.net.URI;
import java.net.http.*;
import java.time.LocalDateTime;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={"spring.datasource.url=jdbc:h2:mem:intervention-tests;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1","logging.level.root=WARN"})
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class InterventionHttpTest {
 @Value("${local.server.port}") int port; @Autowired ObjectMapper json;
 @Autowired com.boruikang.health.mapper.PatientMapper patients;
 @Autowired com.boruikang.health.intervention.service.InterventionService interventions;
 final HttpClient http=HttpClient.newHttpClient(); final Map<String,String> tokens=new HashMap<>();
 Map<String,Object> map(Object... a){Map<String,Object> m=new HashMap<>();for(int i=0;i<a.length;i+=2)m.put((String)a[i],a[i+1]);return m;}
 String at(){return LocalDateTime.now().withNano(0).toString();}
 HttpResponse<String> request(String path,Object body,String token)throws Exception {var b=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/boruikang/admin"+path)).header("Content-Type","application/json");if(token!=null)b.header("Jwttoken",token);return http.send(b.POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body))).build(),HttpResponse.BodyHandlers.ofString());}
 JsonNode ok(String path,Object body,String token)throws Exception{var r=request(path,body,token);assertEquals(200,r.statusCode(),r.body());return json.readTree(r.body()).path("result");}
 String login(String user)throws Exception{if(!tokens.containsKey(user))tokens.put(user,ok("/login",map("identifier",user,"password","HealthDemo@2026!"),null).path("jwt_token").asText());return tokens.get(user);}
 long patient()throws Exception{var p=ok("/patients/create",map("name","虚构服务中心测试"+UUID.randomUUID(),"gender","FEMALE","age",52,"phone","00000000031","department","全科","disease","虚构服务需求","doctor_id",2,"owner_id",6,"outreach",false),login("manager"));ok("/patients/consent",map("id",p.path("id").asLong(),"version",p.path("version").asInt(),"consent_at",at(),"consent_version","DEMO","consent_evidence","虚构服务授权"),login("manager"));return p.path("id").asLong();}
 Map<String,Object> create(long patient,String center,boolean clinical,Long record){return map("patient_id",patient,"center",center,"phase","PRE","category","就医咨询","title","虚构服务事项","content","核对就医资料，临床事项交责任医生判断。","clinical",clinical,"record_id",record,"due_at",LocalDateTime.now().plusHours(1).withNano(0).toString(),"reason","虚构服务登记");}
 Map<String,Object> cmd(JsonNode work,String action){return map("id",work.path("id").asLong(),"version",work.path("version").asInt(),"action",action,"note","虚构办理依据及患者反馈");}
 JsonNode act(JsonNode w,String action,String user)throws Exception{return ok("/interventions/act",cmd(w,action),login(user));}
 @Test void fiveCentersPersistAndScopeToCurrentPatientTeam()throws Exception{
  long p=patient();for(String center:List.of("OUTPATIENT","INPATIENT","EXAM","CONSULTATION","REFERRAL")){
   var w=ok("/interventions/save",create(p,center,false,null),login("nurse"));
   var q=ok("/interventions/query",map("center",center,"phase","PRE","patient_id",p),login("doctor"));assertEquals(1,q.path("page").path("total_size").asInt());
   assertEquals(404,request("/interventions/get",map("id",w.path("id").asLong()),login("operator_a")).statusCode());
   var hidden=ok("/interventions/query",map("center",center,"phase","PRE"),login("operator_a"));for(var item:hidden.path("page").path("items"))assertNotEquals(p,item.path("patient_id").asLong());
   w=act(w,"START","nurse");w=act(w,"COMPLETE","nurse");w=act(w,"CLOSE","nurse");
   var reload=ok("/interventions/get",map("id",w.path("id").asLong()),login("manager"));assertEquals("CLOSED",reload.path("status").asText());assertEquals(4,reload.path("logs").size());
  }
 }
 @Test void reviewInvalidationResultAcknowledgementAndVersionConflicts()throws Exception{
  long p=patient();long record=ok("/records/create",map("patient_id",p,"record_type","OUTPATIENT","occurred_at",at(),"content","虚构报告，无诊疗指令"),login("manager")).path("id").asLong();
  var payload=create(p,"CONSULTATION",true,record);var w=ok("/interventions/save",payload,login("nurse"));w=act(w,"START","nurse");
  assertEquals(400,request("/interventions/act",cmd(w,"COMPLETE"),login("nurse")).statusCode());
  w=act(w,"SUBMIT","nurse");assertEquals(403,request("/interventions/act",cmd(w,"APPROVE"),login("manager")).statusCode());assertEquals(400,request("/interventions/act",cmd(w,"APPROVE"),login("doctor")).statusCode());
  ok("/records/review",map("id",record,"opinion","本人核对虚构原报告"),login("doctor"));w=act(w,"APPROVE","doctor");
  payload.putAll(map("id",w.path("id").asLong(),"version",w.path("version").asInt(),"content","修订后的待审核服务内容","reason","修改患者需求"));
  var edited=ok("/interventions/save",payload,login("nurse"));assertEquals("ACTIVE",edited.path("status").asText());assertEquals("",edited.path("approved_content").asText());
  assertEquals(409,request("/interventions/act",cmd(w,"COMPLETE"),login("nurse")).statusCode());assertEquals(400,request("/interventions/act",cmd(edited,"COMPLETE"),login("nurse")).statusCode());
  w=act(edited,"SUBMIT","nurse");w=act(w,"APPROVE","doctor");w=act(w,"COMPLETE","nurse");assertEquals(400,request("/interventions/act",cmd(w,"CLOSE"),login("nurse")).statusCode());
  w=act(w,"ACKNOWLEDGE","doctor");w=act(w,"CLOSE","nurse");assertEquals("CLOSED",w.path("status").asText());assertTrue(w.path("logs").size()>9);
 }
 @Test void validatesRecordOwnershipArrivalAndEvaluation()throws Exception{
  long p=patient(),other=patient();long record=ok("/records/create",map("patient_id",other,"record_type","EXAM","occurred_at",at(),"content","虚构其他患者报告"),login("manager")).path("id").asLong();
  assertEquals(400,request("/interventions/save",create(p,"EXAM",true,record),login("nurse")).statusCode());
  var w=ok("/interventions/save",create(p,"EXAM",false,null),login("nurse"));var arrival=cmd(w,"ARRIVAL");arrival.put("occurred_at",LocalDateTime.now().plusHours(1).toString());assertEquals(400,request("/interventions/act",arrival,login("nurse")).statusCode());
  arrival.put("occurred_at",at());w=ok("/interventions/act",arrival,login("nurse"));w=act(w,"START","nurse");w=act(w,"COMPLETE","nurse");var rating=cmd(w,"RATE");rating.put("note","虚构患者评价".repeat(240));rating.put("score",5);w=ok("/interventions/act",rating,login("nurse"));
  var q=ok("/interventions/query",map("center","EXAM","phase","PRE","patient_id",p),login("manager"));assertEquals(1,q.path("metrics").path("arrived").asInt());assertEquals(1,q.path("metrics").path("positive").asInt());
  rating=cmd(w,"RATE");rating.put("score",4);assertEquals(400,request("/interventions/act",rating,login("nurse")).statusCode());
 }
 @Test void doctorReassignmentInvalidatesApprovalAndHospitalScopeApplies()throws Exception{
  long p=patient();long record=ok("/records/create",map("patient_id",p,"record_type","OUTPATIENT","occurred_at",at(),"content","虚构改派报告"),login("manager")).path("id").asLong();
  var w=ok("/interventions/save",create(p,"CONSULTATION",true,record),login("nurse"));w=act(w,"SUBMIT","nurse");
  ok("/records/review",map("id",record,"opinion","本人核对原报告"),login("doctor"));w=act(w,"APPROVE","doctor");
  var changed=patients.selectByPrimaryKey(p);changed.doctorId=888L;var ex=new com.boruikang.health.model.PatientExample();ex.eq("id",p);patients.updateByExampleSelective(changed,ex);
  assertEquals(400,request("/interventions/act",cmd(w,"COMPLETE"),login("nurse")).statusCode());
  assertEquals(404,request("/interventions/get",map("id",w.path("id").asLong()),login("doctor")).statusCode());
  w=act(w,"SUBMIT","nurse");assertEquals("REVIEW",w.path("status").asText());assertEquals("",w.path("approved_content").asText());
  assertEquals(403,request("/interventions/query",map("center","CONSULTATION"),login("platform")).statusCode());
  var id=w.path("id").asLong();
  try {
   com.boruikang.health.auth.service.CurrentAccount.set(new com.boruikang.health.auth.dto.AccountInfo(999L,"虚构其他医院主管","MANAGER",2L));
   assertEquals(0,interventions.query(new com.boruikang.health.intervention.dto.QueryInterventionsRequest(0,10,null,"CONSULTATION",null,null,null,null)).page().totalSize());
   assertThrows(com.boruikang.health.common.exception.BizException.class,()->interventions.get(new com.boruikang.health.intervention.dto.GetInterventionRequest(id)));
  } finally {com.boruikang.health.auth.service.CurrentAccount.clear();}
 }
}
