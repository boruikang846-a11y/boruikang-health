package com.boruikang.health.admin;

import com.boruikang.health.auth.dto.AccountInfo;
import com.boruikang.health.auth.service.CurrentAccount;
import com.boruikang.health.mapper.PatientMapper;
import com.boruikang.health.model.PatientExample;
import com.boruikang.health.patient.dto.ImportPatientsRequest;
import com.boruikang.health.patient.service.PatientService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import java.net.URI;
import java.net.http.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

/** File imports use fictional data, actual HTTP role gates and transaction rollback. */
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={
    "spring.datasource.url=jdbc:h2:mem:patient-file-import;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "logging.level.root=WARN"
})
class PatientFileImportTest {
    @Value("${local.server.port}") int port;
    @Autowired ObjectMapper json;
    @Autowired PatientService service;
    @Autowired PatientMapper patients;
    private final HttpClient http=HttpClient.newHttpClient();
    private HttpResponse<String> request(String path,Map<String,Object> body,String token) throws Exception {
        var builder=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/boruikang/admin"+path)).header("Content-Type","application/json");
        if(token!=null)builder.header("Jwttoken",token);
        if(body==null)builder.GET();else builder.POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
        return http.send(builder.build(),HttpResponse.BodyHandlers.ofString());
    }
    private String login(String username) throws Exception {
        var response=request("/login",Map.of("identifier",username,"password","HealthDemo@2026!"),null);
        assertEquals(200,response.statusCode(),response.body());return json.readTree(response.body()).path("result").path("jwt_token").asText();
    }
    private JsonNode call(String path,Map<String,Object> body,String token) throws Exception {
        var response=request(path,body,token);assertEquals(200,response.statusCode(),response.body());return json.readTree(response.body()).path("result");
    }
    private Map<String,Object> row(String name,String external) {
        Map<String,Object> row=new HashMap<>(Map.of("name",name,"gender","MALE","age",66,"phone","00000001111","department","综合服务","disease","虚构管理原因"));
        if(external!=null)row.put("external_id",external);return row;
    }
    private Map<String,Object> batch(String key,long owner,List<Map<String,Object>> rows,boolean outreach) {
        return Map.of("import_batch",key,"doctor_id",2,"owner_id",owner,"source_scene","MANUAL","patient_type","OUTPATIENT","outreach",outreach,"rows",rows);
    }
    @Test void importsProfilesWithTasksAndSkipsDuplicatesAndSameBatchRetries() throws Exception {
        String token=login("manager"),key=UUID.randomUUID().toString(),name="文件演示-"+key;
        var first=row(name,key);first.put("id_card","00000000000000000X");first.put("birth_date","1960-01-01");first.put("inpatient_no","00001");
        var duplicate=row(name+"重复",key);
        var second=row(name+"第二条",null);
        var body=batch(key,3,List.of(first,duplicate,second),true);
        var result=call("/patients/import",body,token);assertEquals(2,result.path("created").asInt());assertEquals(1,result.path("skipped").asInt());assertEquals(key,result.path("import_batch").asText());
        var query=call("/patients/query",Map.of("page",0,"size",10,"keyword",name),token);assertEquals(2,query.path("total_size").asInt());
        for(var item:query.path("items")) {
            var patient=call("/patients/"+item.path("id").asLong(),null,token);
            assertEquals("FILE_IMPORT",patient.path("source_system").asText());assertEquals(2,patient.path("doctor_id").asLong());assertEquals(3,patient.path("owner_id").asLong());
            assertEquals("UNKNOWN",patient.path("risk_level").asText());assertEquals("ENROLLED",patient.path("lifecycle").asText());
            var tasks=call("/tasks/query",Map.of("page",0,"size",10,"patient_id",patient.path("id").asLong(),"task_type","OUTREACH"),token);
            assertEquals(1,tasks.path("items").size());assertTrue(tasks.path("items").get(0).hasNonNull("sla_due_at"));
        }
        var retry=call("/patients/import",body,token);assertEquals(0,retry.path("created").asInt());assertEquals(3,retry.path("skipped").asInt());
        var identity=row(name+"证件重复",UUID.randomUUID().toString());identity.put("id_card","00000000000000000x");
        assertEquals(1,call("/patients/import",batch(UUID.randomUUID().toString(),3,List.of(identity),false),token).path("skipped").asInt());
    }
    @Test void rejectsInvalidWholeBatchesAndAssignmentOrRoleViolations() throws Exception {
        String manager=login("manager"),key=UUID.randomUUID().toString(),name="非法演示-"+key;
        var invalid=row(name+"坏行",null);invalid.put("age",131);
        assertEquals(400,request("/patients/import",batch(key,3,List.of(row(name,null),invalid),true),manager).statusCode());
        assertEquals(0,call("/patients/query",Map.of("page",0,"size",10,"keyword",name),manager).path("total_size").asInt());
        assertEquals(400,request("/patients/import",batch(key,3,Collections.nCopies(501,row(name,null)),false),manager).statusCode());
        var nullRows=new HashMap<>(batch(key,3,List.of(row(name,null)),false));nullRows.put("rows",Arrays.asList((Object)null));
        assertEquals(400,request("/patients/import",nullRows,manager).statusCode());
        assertEquals(403,request("/patients/import",batch(key,4,List.of(row(name,null)),false),login("operator_a")).statusCode());
        for(String username:List.of("doctor","platform")) assertEquals(403,request("/patients/import",batch(key,3,List.of(row(name,null)),false),login(username)).statusCode());
        var badDoctor=new HashMap<>(batch(key,3,List.of(row(name,null)),false));badDoctor.put("doctor_id",3);
        assertEquals(400,request("/patients/import",badDoctor,manager).statusCode());
        assertEquals(401,request("/patients/import",batch(key,3,List.of(row(name,null)),false),null).statusCode());
    }
    @Test void nurseCanImportOwnPatientsWithoutOutreach() throws Exception {
        String token=login("nurse"),key=UUID.randomUUID().toString();long nurse=call("/me",null,token).path("user_id").asLong();
        var result=call("/patients/import",batch(key,nurse,List.of(row("护士导入演示-"+key,key)),false),token);assertEquals(1,result.path("created").asInt());
        var query=call("/patients/query",Map.of("page",0,"size",10,"keyword","护士导入演示-"+key),token);assertEquals(1,query.path("total_size").asInt());
        long id=query.path("items").get(0).path("id").asLong();
        assertEquals(0,call("/tasks/query",Map.of("page",0,"size",10,"patient_id",id,"task_type","OUTREACH"),token).path("total_size").asInt());
    }
    @Test void unexpectedFailureRollsBackEarlierRowsAndTasks() {
        String key=UUID.randomUUID().toString(),name="回滚演示-"+key;
        var good=new ImportPatientsRequest.Row(name,"MALE",66,"00000002222","综合服务","虚构管理原因",key,null,null,null,null,null,null,null,null);
        var bad=new ImportPatientsRequest.Row(null,"MALE",66,"00000002222","综合服务","虚构管理原因",null,null,null,null,null,null,null,null,null);
        CurrentAccount.set(new AccountInfo(1L,"演示主管","MANAGER",1L));
        try {
            assertThrows(NullPointerException.class,()->service.importRows(new ImportPatientsRequest(key,2L,3L,"UNKNOWN","MANUAL",null,true,List.of(good,bad))));
            PatientExample query=new PatientExample();query.eq("hospital_id",1L).eq("name",name);assertEquals(0,patients.countByExample(query));
        } finally { CurrentAccount.clear(); }
    }
    @Test void screeningImportAcceptsSixtyCharacterBatchAndStillDeduplicates() throws Exception {
        String token=login("manager"),key=UUID.randomUUID().toString()+"x".repeat(24);
        var row=Map.of("name","筛查文件演示","phone","00000003333","finding","虚构筛查结论","external_id",key);
        var result=call("/screenings/import",Map.of("source_type","EXAM","import_batch",key,"owner_id",3,"rows",List.of(row,row)),token);
        assertEquals(1,result.path("created").asInt());assertEquals(1,result.path("skipped").asInt());
    }
}
