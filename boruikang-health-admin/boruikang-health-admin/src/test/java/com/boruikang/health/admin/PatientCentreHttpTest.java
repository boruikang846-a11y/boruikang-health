package com.boruikang.health.admin;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import java.net.URI;
import java.net.http.*;
import java.util.List;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;
/** Separate HTTP context keeps these role checks independent of login rate-limit tests. */
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={
    "spring.datasource.url=jdbc:h2:mem:patient-centre-http;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "logging.level.root=WARN"
})
class PatientCentreHttpTest {
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
    @Test void patientCentreCategoriesAndSummaryRespectEveryRoleScope() throws Exception {
        for(String username:List.of("manager","operator_a","nurse","doctor")) {
            String token=login(username);
            var response=request("/boruikang/admin/patients/summary",null,token);
            assertEquals(200,response.statusCode(),response.body());
            JsonNode summary=json.readTree(response.body()).path("result");
            var rows=post("/patients/query",Map.of("page",0,"size",500),token);
            var all=json.createArrayNode();all.addAll((com.fasterxml.jackson.databind.node.ArrayNode)rows.path("items"));
            for(int page=1;all.size()<rows.path("total_size").asLong();page++)
                all.addAll((com.fasterxml.jackson.databind.node.ArrayNode)post("/patients/query",Map.of("page",page,"size",100),token).path("items"));
            assertEquals(rows.path("total_size").asLong(),summary.path("patient_count").asLong());
            assertEquals(all.findValuesAsText("risk_level").stream().filter("UNKNOWN"::equals).count(),summary.path("unknown_risk_count").asLong());
            assertEquals(all.findValuesAsText("risk_level").stream().filter(r->List.of("HIGH","CRITICAL").contains(r)).count(),summary.path("high_risk_count").asLong());
            assertEquals(all.findValuesAsText("source_system").stream().filter("FILE_IMPORT"::equals).count(),summary.path("file_import_count").asLong());
            for(String type:List.of("OUTPATIENT","INPATIENT","DISCHARGED","UNKNOWN")) {
                var filtered=post("/patients/query",Map.of("page",0,"size",1,"patient_type",type),token);
                assertEquals(all.findValuesAsText("patient_type").stream().filter(type::equals).count(),filtered.path("total_size").asLong());
                for(var patient:filtered.path("items"))assertEquals(type,patient.path("patient_type").asText());
            }
            assertEquals(400,request("/boruikang/admin/patients/query","{\"patient_type\":\"OTHER\"}",token).statusCode());
        }
        assertEquals(401,request("/boruikang/admin/patients/summary",null,null).statusCode());
        assertEquals(403,request("/boruikang/admin/patients/summary",null,login("platform")).statusCode());
    }
}
