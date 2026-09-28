package com.bgssai.health.admin;

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
        var result=request("/bgssai/admin/login","{\"identifier\":\""+username+"\",\"password\":\"HealthDemo@2026!\"}",null);
        assertEquals(200,result.statusCode(),result.body());
        return json.readTree(result.body()).path("result").path("jwt_token").asText();
    }
    private JsonNode post(String path,Map<String,Object> body,String token) throws Exception {
        var response=request("/bgssai/admin"+path,json.writeValueAsString(body),token);
        assertEquals(200,response.statusCode(),response.body());
        return json.readTree(response.body()).path("result");
    }
    @Test void concurrentContactCommitsExactlyOneMessageAndAudit() throws Exception {
        String nurse=login("operator_a"),manager=login("manager");
        JsonNode row=post("/tasks/create",Map.of("patient_id",1001,"task_type","FOLLOWUP","title","Concurrent contact test",
            "priority","P2","due_at",LocalDateTime.now().plusDays(1).withNano(0).toString(),"request_key",UUID.randomUUID().toString()),nurse);
        long id=row.path("id").asLong();
        row=post("/tasks/claim",Map.of("id",id,"version",row.path("version").asInt()),nurse);
        row=post("/tasks/draft",Map.of("id",id,"version",row.path("version").asInt(),"mode","TEMPLATE"),nurse);
        row=post("/tasks/submit-review",Map.of("id",id,"version",row.path("version").asInt()),nurse);
        row=post("/tasks/review",Map.of("id",id,"version",row.path("version").asInt(),"approved",true,"approved_text","请核对原医嘱并记录问题。","review_channel","HOSPITAL_SYSTEM","review_evidence","虚构院方审核回执 TEST-HTTP","reviewed_at",LocalDateTime.now().withNano(0).toString()),manager);
        String body=json.writeValueAsString(Map.of("id",id,"version",row.path("version").asInt(),"evidence","测试人工电话核验，患者确认收到已审核建议","contact_at",LocalDateTime.now().minusSeconds(1).toString(),"method","PHONE","identity_verified",true,"recipient_role","PATIENT","report_reviewed",true,"medication_feedback","未调整用药","patient_questions","暂无问题"));
        var start=new CountDownLatch(1);
        try(var workers=Executors.newVirtualThreadPerTaskExecutor()) {
            var first=workers.submit(()->{start.await();return request("/bgssai/admin/tasks/contact",body,nurse).statusCode();});
            var second=workers.submit(()->{start.await();return request("/bgssai/admin/tasks/contact",body,nurse).statusCode();});
            start.countDown();
            assertEquals(List.of(200,409),List.of(first.get(20,TimeUnit.SECONDS),second.get(20,TimeUnit.SECONDS)).stream().sorted().toList());
        }
        var context=json.readTree(request("/bgssai/admin/tasks/"+id,null,nurse).body()).path("result");
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
        assertEquals(403,request("/bgssai/admin/hospital/mock/query","{\"scenario\":\"NORMAL\"}",operator).statusCode());
        assertEquals(503,request("/bgssai/admin/hospital/sync","{\"scenario\":\"UNAVAILABLE\",\"doctor_id\":2,\"owner_id\":3}",manager).statusCode());
        var preview=post("/hospital/mock/query",Map.of("scenario","NORMAL"),manager);
        assertEquals("HOSPITAL_MOCK",preview.path("source_system").asText());assertEquals(2,preview.path("patients").size());
        var imported=post("/hospital/sync",Map.of("scenario","NORMAL","doctor_id",2,"owner_id",3),manager);
        assertEquals(2,imported.path("created_patients").asInt());assertEquals(3,imported.path("created_records").asInt());
        var again=post("/hospital/sync",Map.of("scenario","NORMAL","doctor_id",2,"owner_id",3),manager);
        assertEquals(0,again.path("created_records").asInt());assertEquals(3,again.path("skipped_records").asInt());
        long patientId=imported.path("patient_ids").get(0).asLong();
        var patient=json.readTree(request("/bgssai/admin/patients/"+patientId,null,manager).body()).path("result");
        assertEquals("MOCK-P-001",patient.path("hospital_patient_id").asText());
        var records=post("/records/query",Map.of("patient_id",patientId,"page",0,"size",100),manager);
        assertEquals(2,records.path("total_size").asInt());assertTrue(records.path("items").get(0).has("external_id"));
    }
    @Test void healthAndProtectedRoutesHaveDifferentAccessRules() throws Exception {
        assertEquals(200,request("/bgssai/health/liveness",null,null).statusCode());
        assertEquals(200,request("/overview",null,null).statusCode());
        assertEquals(200,request("/hospital",null,null).statusCode());
        assertEquals(401,request("/bgssai/admin/dashboard",null,null).statusCode());
        assertEquals(404,request("/bgssai/admin/unknown",null,null).statusCode());
    }
    @Test void newLoginRevokesOldSessionAndLogoutRevokesNewOne() throws Exception {
        String old=login("manager"),latest=login("manager");
        assertEquals(401,request("/bgssai/admin/me",null,old).statusCode());
        assertEquals(200,request("/bgssai/admin/me",null,latest).statusCode());
        assertEquals(200,request("/bgssai/admin/logout","{}",latest).statusCode());
        assertEquals(401,request("/bgssai/admin/me",null,latest).statusCode());
    }
    @Test void actualHttpContractUsesSnakeCaseAndRejectsUnknownFields() throws Exception {
        String token=login("operator_a");
        var response=request("/bgssai/admin/patients/query","{\"page\":0,\"size\":1}",token);
        assertEquals(200,response.statusCode(),response.body());
        JsonNode result=json.readTree(response.body()).path("result");
        assertTrue(result.has("total_size"));assertFalse(result.has("totalSize"));
        assertTrue(result.path("items").get(0).has("risk_level"));
        assertEquals(400,request("/bgssai/admin/patients/query","{\"page\":0,\"size\":10,\"hospital_id\":2}",token).statusCode());
        assertEquals(400,request("/bgssai/admin/tasks/contact","{\"id\":1,\"version\":0}",token).statusCode());
    }
    @Test void patientRoleCannotLogInToAdmin() throws Exception {
        var result=request("/bgssai/admin/login","{\"identifier\":\"patient\",\"password\":\"HealthDemo@2026!\"}",null);
        assertTrue(result.statusCode()>=400);
    }
    @Test void hospitalCliniciansHaveNoAdminLoginAndAreListedAsContacts() throws Exception {
        for(String identifier:List.of("doctor","nurse")) {
            var result=request("/bgssai/admin/login","{\"identifier\":\""+identifier+"\",\"password\":\"HealthDemo@2026!\"}",null);
            assertTrue(result.statusCode()>=400);
        }
        String manager=login("manager");
        var clinicians=request("/bgssai/admin/clinicians",null,manager);
        assertEquals(200,clinicians.statusCode(),clinicians.body());
        assertTrue(clinicians.body().contains("演示院方责任医生"));
    }
    @Test void managerRegistersHospitalContactWithoutCreatingAnAccount() throws Exception {
        String manager=login("manager"),operator=login("operator_a");
        String name="虚构院方联系人"+UUID.randomUUID().toString().substring(0,8);
        String body=json.writeValueAsString(Map.of("name",name,"department","测试科室"));
        assertEquals(403,request("/bgssai/admin/clinicians/create",body,operator).statusCode());
        var created=request("/bgssai/admin/clinicians/create",body,manager);
        assertEquals(200,created.statusCode(),created.body());
        assertEquals(name,json.readTree(created.body()).path("result").path("name").asText());
        assertEquals(400,request("/bgssai/admin/clinicians/create",body,manager).statusCode());
        assertTrue(request("/bgssai/admin/login","{\"identifier\":\""+name+"\",\"password\":\"HealthDemo@2026!\"}",null).statusCode()>=400);
    }
    @Test void platformHasOnlyConfigurationAccess() throws Exception {
        String token=login("platform");
        assertEquals(403,request("/bgssai/admin/dashboard",null,token).statusCode());
        var integrations=request("/bgssai/admin/integrations",null,token);
        assertEquals(200,integrations.statusCode());assertFalse(integrations.body().contains("\"secret\":"));
        assertEquals(400,request("/bgssai/admin/integrations/save","{\"provider\":\"AI\",\"endpoint\":\"http://127.0.0.1/private\",\"model_name\":\"test\",\"secret\":\"test\",\"enabled\":true}",token).statusCode());
    }
}
