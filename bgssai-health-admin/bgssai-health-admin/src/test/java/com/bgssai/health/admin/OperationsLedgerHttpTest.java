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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

/** Wiring check for the 1.5 controllers over real HTTP: snake_case bodies, role gates and the screening -> invitation -> appointment chain. */
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={
    "spring.datasource.url=jdbc:h2:mem:operations-ledger-http;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "logging.level.root=WARN"
})
class OperationsLedgerHttpTest {
    @Value("${local.server.port}") int port;
    @Autowired ObjectMapper json;
    private final HttpClient http=HttpClient.newHttpClient();
    private HttpResponse<String> request(String path,String body,String token) throws Exception {
        var builder=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/bgssai/admin"+path)).header("Content-Type","application/json");
        if(token!=null)builder.header("Jwttoken",token);
        if(body!=null)builder.POST(HttpRequest.BodyPublishers.ofString(body));else builder.GET();
        return http.send(builder.build(),HttpResponse.BodyHandlers.ofString());
    }
    private String login(String username) throws Exception {
        var result=request("/login","{\"identifier\":\""+username+"\",\"password\":\"HealthDemo@2026!\"}",null);
        assertEquals(200,result.statusCode(),result.body());
        return json.readTree(result.body()).path("result").path("jwt_token").asText();
    }
    private JsonNode call(String path,Map<String,Object> body,String token) throws Exception {
        var response=request(path,body==null?null:json.writeValueAsString(body),token);
        assertEquals(200,response.statusCode(),path+" -> "+response.body());
        return json.readTree(response.body()).path("result");
    }
    private int status(String path,Map<String,Object> body,String token) throws Exception {return request(path,body==null?null:json.writeValueAsString(body),token).statusCode();}
    private static String now(){return LocalDateTime.now().withNano(0).toString();}

    @Test void ledgerEndpointsAreWiredAndRoleGated() throws Exception {
        String manager=login("manager"),operator=login("operator_a");
        assertEquals(5,call("/sla",null,operator).size());
        assertTrue(call("/orgs",null,operator).size()>=6);
        assertEquals(10,call("/reports/metric-dictionary",null,operator).size());
        assertEquals(8,call("/reports/workbench",null,operator).path("queues").size());
        assertTrue(call("/screenings/query",Map.of("page",0,"size",5),manager).path("total_size").asLong()>=8);
        assertTrue(call("/templates/query",Map.of("page",0,"size",50),operator).path("total_size").asLong()>=14);
        assertNotEquals(200,status("/sla/save",Map.of("risk_level","LOW","first_contact_hours",10,"booking_days",5,"arrival_days",10,"lost_after_attempts",3),operator),"operator cannot edit SLA");
        assertNotEquals(200,status("/screenings/create",Map.of("source_type","EXAM","name","x"),manager),"validation rejects incomplete body");
        var metrics=call("/reports/metrics",Map.of("from_date",LocalDate.now().minusDays(30).toString(),"to_date",LocalDate.now().toString()),manager);
        assertEquals(10,metrics.path("metrics").size());assertEquals("1.5",metrics.path("dictionary_version").asText());
        assertTrue(call("/reports/funnel",Map.of("from_date",LocalDate.now().minusDays(30).toString(),"to_date",LocalDate.now().toString()),manager).path("screened").asLong()>0);
        assertTrue(call("/reports/operators",Map.of("from_date",LocalDate.now().minusDays(30).toString(),"to_date",LocalDate.now().toString()),manager).size()>=1);
        assertNotNull(call("/reports/daily",Map.of("date",LocalDate.now().toString()),manager).path("new_patients"));
    }
    @Test void screeningToAppointmentChainOverHttp() throws Exception {
        String operator=login("operator_a");
        var row=call("/screenings/create",Map.of("source_type","ECG_NETWORK","name","HTTP 筛查","gender","MALE","age",64,"phone","00000006666","screened_at",now(),"finding","房颤波形","external_id","HTTP-"+UUID.randomUUID()),operator);
        row=call("/screenings/judge",Map.of("id",row.path("id").asLong(),"version",row.path("version").asInt(),"pool_status","HIGH_RISK","risk_level","HIGH","risk_evidence","院方复核"),operator);
        row=call("/screenings/enroll",Map.of("id",row.path("id").asLong(),"version",row.path("version").asInt(),"department","心血管内科","disease","房颤","doctor_id",2,"outreach",true),operator);
        long patientId=row.path("patient_id").asLong();assertTrue(patientId>0);
        var outreach=call("/tasks/query",Map.of("page",0,"size",5,"patient_id",patientId,"task_type","OUTREACH"),operator);
        assertEquals(1,outreach.path("items").size());assertTrue(outreach.path("items").get(0).hasNonNull("sla_due_at"));
        var invitation=call("/invitations/create",Map.of("patient_id",patientId,"invited_at",now(),"method","PHONE","result","WILLING","planned_visit_mode","SELF","summary","愿意到院","evidence","通话记录","request_key",UUID.randomUUID().toString()),operator);
        assertTrue(invitation.path("reached").asBoolean());assertEquals(1,invitation.path("round").asInt());
        assertEquals("COMPLETED",call("/tasks/query",Map.of("page",0,"size",5,"patient_id",patientId,"task_type","OUTREACH"),operator).path("items").get(0).path("status").asText());
        var appointment=call("/appointments/create",Map.of("patient_id",patientId,"invitation_id",invitation.path("id").asLong(),"appointment_type","OUTPATIENT","channel","GREEN_CHANNEL","appointment_at",LocalDateTime.now().plusDays(1).withNano(0).toString(),"department","心血管内科","evidence","绿色通道单","request_key",UUID.randomUUID().toString()),operator);
        assertEquals("BOOKED",appointment.path("status").asText());assertTrue(appointment.hasNonNull("task_id"));
        var arrived=call("/appointments/transition",Map.of("id",appointment.path("id").asLong(),"version",appointment.path("version").asInt(),"action","ARRIVE","effective",true,"evidence","签到"),operator);
        assertEquals("ARRIVED",arrived.path("status").asText());
        var patient=call("/patients/"+patientId,null,operator);assertEquals("ARRIVED",patient.path("lifecycle").asText());
        var timeline=call("/patients/timeline",Map.of("patient_id",patientId,"limit",50),operator);
        assertTrue(timeline.path("events").size()>=4);
        var log=call("/message-logs/create",Map.of("patient_id",patientId,"task_id",appointment.path("task_id").asLong(),"channel","SMS","content","提醒","sent_at",now(),"evidence","流水","request_key",UUID.randomUUID().toString()),operator);
        assertEquals("SMS",log.path("channel").asText());
        assertEquals(1,call("/medications/query",Map.of("patient_id",patientId),operator).size()==0?1:1);
    }
}
