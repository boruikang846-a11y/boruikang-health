package com.boruikang.health.admin;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={
    "spring.datasource.url=jdbc:h2:mem:health-admin-http;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "logging.level.root=WARN"
})
class AdminHttpTest {
    @Value("${local.server.port}") int port;
    @Autowired ObjectMapper json;
    private final HttpClient http=HttpClient.newHttpClient();
    private HttpResponse<String> request(String path,String body,String token) throws Exception {
        var builder=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+path)).header("Content-Type","application/json");
        if(token!=null)builder.header("Jwttoken",token);
        if(body!=null)builder.POST(HttpRequest.BodyPublishers.ofString(body));else builder.GET();
        return http.send(builder.build(),HttpResponse.BodyHandlers.ofString());
    }
    private String login(String username) throws Exception {
        var result=request("/boruikang/admin/login","{\"identifier\":\""+username+"\",\"password\":\"HealthDemo@2026!\"}",null);
        assertEquals(200,result.statusCode(),result.body());
        return json.readTree(result.body()).path("result").path("jwt_token").asText();
    }
    private JsonNode post(String path,Map<String,Object> body,String token) throws Exception {
        var response=request("/boruikang/admin"+path,json.writeValueAsString(body),token);
        assertEquals(200,response.statusCode(),response.body());
        return json.readTree(response.body()).path("result");
    }
    @Test void concurrentContactCommitsExactlyOneMessageAndAudit() throws Exception {
        String nurse=login("operator_a"),doctor=login("doctor");
        JsonNode row=post("/tasks/create",Map.of("patient_id",1001,"task_type","FOLLOWUP","title","Concurrent contact test",
            "priority","P2","due_at",LocalDateTime.now().plusDays(1).withNano(0).toString(),"request_key",UUID.randomUUID().toString()),nurse);
        long id=row.path("id").asLong();
        row=post("/tasks/claim",Map.of("id",id,"version",row.path("version").asInt()),nurse);
        row=post("/tasks/draft",Map.of("id",id,"version",row.path("version").asInt(),"mode","TEMPLATE"),nurse);
        row=post("/tasks/submit-review",Map.of("id",id,"version",row.path("version").asInt()),nurse);
        assertEquals(403,request("/boruikang/admin/tasks/review",json.writeValueAsString(Map.of("id",id,"version",row.path("version").asInt(),"approved",true,"approved_text","运营代审核")),nurse).statusCode());
        row=post("/tasks/review",Map.of("id",id,"version",row.path("version").asInt(),"approved",true,"approved_text","请核对原医嘱并记录问题。"),doctor);
        String body=json.writeValueAsString(Map.of("id",id,"version",row.path("version").asInt(),"evidence","测试人工电话核验，患者确认收到已审核建议","contact_at",LocalDateTime.now().minusSeconds(1).toString(),"method","PHONE","identity_verified",true,"recipient_role","PATIENT","report_reviewed",true,"medication_feedback","未调整用药","patient_questions","暂无问题"));
        var start=new CountDownLatch(1);
        try(var workers=Executors.newVirtualThreadPerTaskExecutor()) {
            var first=workers.submit(()->{start.await();return request("/boruikang/admin/tasks/contact",body,nurse).statusCode();});
            var second=workers.submit(()->{start.await();return request("/boruikang/admin/tasks/contact",body,nurse).statusCode();});
            start.countDown();
            assertEquals(List.of(200,409),List.of(first.get(20,TimeUnit.SECONDS),second.get(20,TimeUnit.SECONDS)).stream().sorted().toList());
        }
        var context=json.readTree(request("/boruikang/admin/tasks/"+id,null,nurse).body()).path("result");
        assertEquals("CONTACTED",context.path("task").path("status").asText());
        assertEquals(1,context.path("messages").size());assertEquals(1,context.path("attempts").size());
        var audit=post("/audits/query",Map.of("patient_id",1001,"page",0,"size",100),nurse);
        long contacts=0;
        for(JsonNode event:audit.path("items"))if(event.path("resource_id").asLong()==id&&"MANUAL_CONTACT_RECORDED".equals(event.path("action").asText()))contacts++;
        assertEquals(1,contacts);
        post("/tasks/transition",Map.of("id",id,"version",context.path("task").path("version").asInt(),"action","COMPLETE","outcome","并发请求验证完成"),nurse);
    }
    @Test void hospitalMockHttpContractIsScopedIdempotentAndReportsUnavailable() throws Exception {
        String manager=login("manager"),operator=login("operator_a");
        assertEquals(403,request("/boruikang/admin/hospital/mock/query","{\"scenario\":\"NORMAL\"}",operator).statusCode());
        assertEquals(503,request("/boruikang/admin/hospital/sync","{\"scenario\":\"UNAVAILABLE\",\"doctor_id\":2,\"owner_id\":3}",manager).statusCode());
        var preview=post("/hospital/mock/query",Map.of("scenario","NORMAL"),manager);
        assertEquals("HOSPITAL_MOCK",preview.path("source_system").asText());assertEquals(2,preview.path("patients").size());
        var imported=post("/hospital/sync",Map.of("scenario","NORMAL","doctor_id",2,"owner_id",3),manager);
        assertEquals(2,imported.path("created_patients").asInt());assertEquals(3,imported.path("created_records").asInt());
        var again=post("/hospital/sync",Map.of("scenario","NORMAL","doctor_id",2,"owner_id",3),manager);
        assertEquals(0,again.path("created_records").asInt());assertEquals(3,again.path("skipped_records").asInt());
        long patientId=imported.path("patient_ids").get(0).asLong();
        var patient=json.readTree(request("/boruikang/admin/patients/"+patientId,null,manager).body()).path("result");
        assertEquals("MOCK-P-001",patient.path("hospital_patient_id").asText());
        var records=post("/records/query",Map.of("patient_id",patientId,"page",0,"size",100),manager);
        assertEquals(2,records.path("total_size").asInt());assertTrue(records.path("items").get(0).has("external_id"));
        assertEquals(403,request("/boruikang/admin/integrations/save",json.writeValueAsString(Map.of("provider","AI","endpoint","https://api.deepseek.com/chat/completions","model_name","deepseek-flash","secret","sk-unit-test-secret","enabled",true)),operator).statusCode());
    }
    @Test void healthAndProtectedRoutesHaveDifferentAccessRules() throws Exception {
        assertEquals(200,request("/boruikang/health/liveness",null,null).statusCode());
        assertEquals(200,request("/overview",null,null).statusCode());
        assertEquals(200,request("/hospital",null,null).statusCode());
        for(String deepLink:List.of("/doctor","/doctor/reports","/doctor/reviews","/accounts","/screening","/invitations","/appointments","/packages","/referrals"))
            assertEquals(200,request(deepLink,null,null).statusCode(),deepLink);
        assertEquals(401,request("/boruikang/admin/dashboard",null,null).statusCode());
        assertEquals(404,request("/boruikang/admin/unknown",null,null).statusCode());
    }
    @Test void newLoginRevokesOldSessionAndLogoutRevokesNewOne() throws Exception {
        String old=login("manager"),latest=login("manager");
        assertEquals(401,request("/boruikang/admin/me",null,old).statusCode());
        assertEquals(200,request("/boruikang/admin/me",null,latest).statusCode());
        assertEquals(200,request("/boruikang/admin/logout","{}",latest).statusCode());
        assertEquals(401,request("/boruikang/admin/me",null,latest).statusCode());
    }
    @Test void actualHttpContractUsesSnakeCaseAndRejectsUnknownFields() throws Exception {
        String token=login("operator_a");
        var response=request("/boruikang/admin/patients/query","{\"page\":0,\"size\":1}",token);
        assertEquals(200,response.statusCode(),response.body());
        JsonNode result=json.readTree(response.body()).path("result");
        assertTrue(result.has("total_size"));assertFalse(result.has("totalSize"));
        assertTrue(result.path("items").get(0).has("risk_level"));
        assertEquals(400,request("/boruikang/admin/patients/query","{\"page\":0,\"size\":10,\"hospital_id\":2}",token).statusCode());
        assertEquals(400,request("/boruikang/admin/tasks/contact","{\"id\":1,\"version\":0}",token).statusCode());
    }
    @Test void patientRoleCannotLogInToAdmin() throws Exception {
        var result=request("/boruikang/admin/login","{\"identifier\":\"patient\",\"password\":\"HealthDemo@2026!\"}",null);
        assertTrue(result.statusCode()>=400);
    }
    @Test void doctorsAndNursesLogInWithTheirOwnScope() throws Exception {
        String doctor=login("doctor"),nurse=login("nurse");
        assertEquals("DOCTOR",json.readTree(request("/boruikang/admin/me",null,doctor).body()).path("result").path("role_code").asText());
        assertEquals("NURSE",json.readTree(request("/boruikang/admin/me",null,nurse).body()).path("result").path("role_code").asText());
        var workbench=request("/boruikang/admin/doctor/workbench",null,doctor);
        assertEquals(200,workbench.statusCode(),workbench.body());assertTrue(json.readTree(workbench.body()).path("result").has("unread_report_count"));
        assertEquals(403,request("/boruikang/admin/doctor/workbench",null,nurse).statusCode());
        assertEquals(403,request("/boruikang/admin/screenings/query","{\"page\":0,\"size\":10}",doctor).statusCode());
        assertEquals(403,request("/boruikang/admin/patients/create",json.writeValueAsString(Map.of("name","医生不能建档","gender","MALE","age",50,"phone","00000009999","department","测试","disease","测试")),doctor).statusCode());
        assertEquals(200,request("/boruikang/admin/screenings/query","{\"page\":0,\"size\":10}",nurse).statusCode());
        var reports=post("/records/reports",Map.of("page",0,"size",5,"viewed",false),doctor);
        assertTrue(reports.has("total_size"));
        var clinicians=request("/boruikang/admin/clinicians",null,nurse);
        assertEquals(200,clinicians.statusCode(),clinicians.body());assertTrue(clinicians.body().contains("演示责任医生"));
    }
    @Test void managerOpensAccountsThatCanLogInAndBeDisabled() throws Exception {
        String manager=login("manager"),operator=login("operator_a");
        String username="doctor_"+UUID.randomUUID().toString().substring(0,8);
        String body=json.writeValueAsString(Map.of("username",username,"real_name","新开通医生","role_code","DOCTOR","department","心血管内科","password","Initial@2026"));
        assertEquals(403,request("/boruikang/admin/accounts/create",body,operator).statusCode());
        assertEquals(400,request("/boruikang/admin/accounts/create",json.writeValueAsString(Map.of("username",username,"real_name","缺科室","role_code","NURSE","password","Initial@2026")),manager).statusCode());
        var created=post("/accounts/create",Map.of("username",username,"real_name","新开通医生","role_code","DOCTOR","department","心血管内科","password","Initial@2026"),manager);
        assertEquals("DOCTOR",created.path("role_code").asText());assertFalse(created.has("password"));
        assertEquals(400,request("/boruikang/admin/accounts/create",body,manager).statusCode());
        var login=request("/boruikang/admin/login",json.writeValueAsString(Map.of("identifier",username,"password","Initial@2026")),null);
        assertEquals(200,login.statusCode(),login.body());String token=json.readTree(login.body()).path("result").path("jwt_token").asText();
        long id=created.path("id").asLong();
        post("/accounts/status",Map.of("id",id,"enabled",false),manager);
        assertEquals(401,request("/boruikang/admin/me",null,token).statusCode());
        assertTrue(request("/boruikang/admin/login",json.writeValueAsString(Map.of("identifier",username,"password","Initial@2026")),null).statusCode()>=400);
        post("/accounts/status",Map.of("id",id,"enabled",true),manager);
        post("/accounts/reset-password",Map.of("id",id,"password","Changed@2026"),manager);
        assertTrue(request("/boruikang/admin/login",json.writeValueAsString(Map.of("identifier",username,"password","Initial@2026")),null).statusCode()>=400);
        assertEquals(200,request("/boruikang/admin/login",json.writeValueAsString(Map.of("identifier",username,"password","Changed@2026")),null).statusCode());
        assertEquals(403,request("/boruikang/admin/accounts/status",json.writeValueAsString(Map.of("id",1,"enabled",false)),manager).statusCode());
        var list=post("/accounts/query",Map.of("page",0,"size",100,"role_code","DOCTOR"),manager);
        assertTrue(list.path("total_size").asInt()>=5);
    }
    @Test void passwordChangeNeedsTheOldPasswordAndRenewsTheLogin() throws Exception {
        String manager=login("manager");
        String username="nurse_"+UUID.randomUUID().toString().substring(0,8);
        post("/accounts/create",Map.of("username",username,"real_name","改密测试护士","role_code","NURSE","department","心血管内科","password","Initial@2026"),manager);
        var first=json.readTree(request("/boruikang/admin/login",json.writeValueAsString(Map.of("identifier",username,"password","Initial@2026")),null).body()).path("result").path("jwt_token").asText();
        assertEquals(400,request("/boruikang/admin/password",json.writeValueAsString(Map.of("old_password","Wrong@2026","new_password","Renewed@2026")),first).statusCode());
        var renewed=post("/password",Map.of("old_password","Initial@2026","new_password","Renewed@2026"),first);
        String token=renewed.path("jwt_token").asText();
        assertEquals(401,request("/boruikang/admin/me",null,first).statusCode());
        assertEquals(200,request("/boruikang/admin/me",null,token).statusCode());
        assertEquals(200,request("/boruikang/admin/login",json.writeValueAsString(Map.of("identifier",username,"password","Renewed@2026")),null).statusCode());
    }
    @Test void platformHasOnlyConfigurationAccess() throws Exception {
        String token=login("platform");
        assertEquals(403,request("/boruikang/admin/dashboard",null,token).statusCode());
        var integrations=request("/boruikang/admin/integrations",null,token);
        assertEquals(200,integrations.statusCode());assertFalse(integrations.body().contains("\"secret\":"));
        assertEquals(400,request("/boruikang/admin/integrations/save","{\"provider\":\"AI\",\"endpoint\":\"http://127.0.0.1/private\",\"model_name\":\"test\",\"secret\":\"test\",\"enabled\":true}",token).statusCode());
        for(String endpoint:List.of("https://dev.legacy-ai.example.com/v1/chat/completions","https://www.legacy-ai.example.com/v1/chat/completions")) {
            assertEquals(400,request("/boruikang/admin/integrations/save",json.writeValueAsString(Map.of("provider","AI","endpoint",endpoint,"model_name","deepseek-flash","secret","old-key","enabled",true)),token).statusCode());
        }
        String secret="sk-unit-test-secret";
        assertEquals(400,request("/boruikang/admin/integrations/save",json.writeValueAsString(Map.of("provider","AI","endpoint","https://api.deepseek.com/chat/completions","model_name","deepseek-chat","secret",secret,"enabled",true)),token).statusCode());
        var savedResponse=request("/boruikang/admin/integrations/save",json.writeValueAsString(Map.of("provider","AI","endpoint","https://api.deepseek.com/chat/completions","model_name","deepseek-flash","secret",secret,"enabled",true)),token);
        assertEquals(200,savedResponse.statusCode(),savedResponse.body());
        assertFalse(savedResponse.body().contains(secret));
        JsonNode saved=json.readTree(savedResponse.body()).path("result");
        assertEquals("deepseek-flash",saved.path("model_name").asText());
        assertTrue(saved.path("enabled").asBoolean());assertTrue(saved.path("configured").asBoolean());
        assertEquals("CONFIGURED_UNVERIFIED",saved.path("status").asText());
        String body=json.writeValueAsString(Map.of("provider","AI","endpoint","https://api.deepseek.com/chat/completions","model_name","deepseek-v4-pro","secret","","enabled",false));
        var updatedResponse=request("/boruikang/admin/integrations/save",body,token);
        assertEquals(200,updatedResponse.statusCode(),updatedResponse.body());
        assertFalse(updatedResponse.body().contains(secret));
        assertTrue(json.readTree(updatedResponse.body()).path("result").path("configured").asBoolean());
        assertFalse(json.readTree(updatedResponse.body()).path("result").path("enabled").asBoolean());
    }
}
