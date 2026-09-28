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
        String nurse=login("nurse"),doctor=login("doctor");
        JsonNode row=post("/tasks/create",Map.of("patient_id",1001,"task_type","FOLLOWUP","title","Concurrent contact test",
            "priority","P2","due_at",LocalDateTime.now().plusDays(1).withNano(0).toString(),"request_key",UUID.randomUUID().toString()),nurse);
        long id=row.path("id").asLong();
        row=post("/tasks/claim",Map.of("id",id,"version",row.path("version").asInt()),nurse);
        row=post("/tasks/draft",Map.of("id",id,"version",row.path("version").asInt(),"sop_id",1,"mode","TEMPLATE"),nurse);
        row=post("/tasks/submit-review",Map.of("id",id,"version",row.path("version").asInt()),nurse);
        row=post("/tasks/review",Map.of("id",id,"version",row.path("version").asInt(),"approved",true,"approved_text","请核对原医嘱并记录问题。"),doctor);
        String body=json.writeValueAsString(Map.of("id",id,"version",row.path("version").asInt(),"evidence","测试人工电话核验，患者确认收到已审核建议"));
        var start=new CountDownLatch(1);
        try(var workers=Executors.newVirtualThreadPerTaskExecutor()) {
            var first=workers.submit(()->{start.await();return request("/bgssai/admin/tasks/contact",body,nurse).statusCode();});
            var second=workers.submit(()->{start.await();return request("/bgssai/admin/tasks/contact",body,nurse).statusCode();});
            start.countDown();
            assertEquals(List.of(200,409),List.of(first.get(20,TimeUnit.SECONDS),second.get(20,TimeUnit.SECONDS)).stream().sorted().toList());
        }
        var context=json.readTree(request("/bgssai/admin/tasks/"+id,null,nurse).body()).path("result");
        assertEquals("CONTACTED",context.path("task").path("status").asText());
        assertEquals(1,context.path("messages").size());
        var audit=post("/audits/query",Map.of("patient_id",1001,"page",0,"size",100),nurse);
        long contacts=0;
        for(JsonNode event:audit.path("items"))if(event.path("resource_id").asLong()==id&&"MANUAL_CONTACT_RECORDED".equals(event.path("action").asText()))contacts++;
        assertEquals(1,contacts);
        post("/tasks/transition",Map.of("id",id,"version",context.path("task").path("version").asInt(),"action","COMPLETE","outcome","并发请求验证完成"),nurse);
    }
    @Test void healthAndProtectedRoutesHaveDifferentAccessRules() throws Exception {
        assertEquals(200,request("/bgssai/health/liveness",null,null).statusCode());
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
        String token=login("nurse");
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
        assertEquals(403,result.statusCode());
    }
    @Test void platformHasOnlyConfigurationAccess() throws Exception {
        String token=login("platform");
        assertEquals(403,request("/bgssai/admin/dashboard",null,token).statusCode());
        var integrations=request("/bgssai/admin/integrations",null,token);
        assertEquals(200,integrations.statusCode());assertFalse(integrations.body().contains("\"secret\":"));
        assertEquals(400,request("/bgssai/admin/integrations/save","{\"provider\":\"AI\",\"endpoint\":\"http://127.0.0.1/private\",\"model_name\":\"test\",\"secret\":\"test\",\"enabled\":true}",token).statusCode());
    }
}
