package com.bgssai.health.admin;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import java.net.URI;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={"spring.datasource.url=jdbc:h2:mem:patient-upload;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1","logging.level.root=WARN"})
class PatientUploadHttpTest {
    @Value("${local.server.port}") int port;
    @Autowired ObjectMapper json;
    final HttpClient http=HttpClient.newHttpClient();
    String base(){return "http://127.0.0.1:"+port+"/bgssai/admin";}
    String login(String user)throws Exception{
        var request=HttpRequest.newBuilder(URI.create(base()+"/login")).header("Content-Type","application/json").POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(Map.of("identifier",user,"password","HealthDemo@2026!")))).build();
        var response=http.send(request,HttpResponse.BodyHandlers.ofString());assertEquals(200,response.statusCode());return json.readTree(response.body()).path("result").path("jwt_token").asText();
    }
    HttpResponse<String> upload(String token,String file,String content,String batch,long owner)throws Exception{
        return uploadBytes(token,file,content.getBytes(StandardCharsets.UTF_8),batch,owner);
    }
    HttpResponse<String> uploadBytes(String token,String file,byte[] content,String batch,long owner)throws Exception{
        String boundary="test-"+UUID.randomUUID();String settings=json.writeValueAsString(Map.of("import_batch",batch,"doctor_id",2,"owner_id",owner,"patient_type","DISCHARGED","source_scene","DISCHARGE","outreach",false));
        String body="--"+boundary+"\r\nContent-Disposition: form-data; name=\"settings\"\r\nContent-Type: application/json\r\n\r\n"+settings+"\r\n--"+boundary+"\r\nContent-Disposition: form-data; name=\"file\"; filename=\""+file+"\"\r\nContent-Type: text/csv\r\n\r\n"+"";
        var stream=new java.io.ByteArrayOutputStream();stream.write(body.getBytes(StandardCharsets.UTF_8));stream.write(content);stream.write(("\r\n--"+boundary+"--\r\n").getBytes(StandardCharsets.UTF_8));
        var builder=HttpRequest.newBuilder(URI.create(base()+"/patients/import_file")).header("Content-Type","multipart/form-data; boundary="+boundary).POST(HttpRequest.BodyPublishers.ofByteArray(stream.toByteArray()));
        if(token!=null)builder.header("Jwttoken",token);return http.send(builder.build(),HttpResponse.BodyHandlers.ofString());
    }
    String csv(String id){return "姓名,性别,年龄,联系电话,科室,病种/管理原因,来源编号\n虚构文件对象,男,51,00000000016,全科,虚构管理原因,"+id+"\n";}
    @Test void directCsvUploadPersistsAndRetryDoesNotDuplicate()throws Exception{
        String token=login("manager"),key=UUID.randomUUID().toString();var first=upload(token,"patients.csv",csv(key),key,3);assertEquals(200,first.statusCode(),first.body());assertEquals(1,json.readTree(first.body()).path("result").path("created").asInt());
        var retry=upload(token,"patients.csv",csv(key),key,3);assertEquals(200,retry.statusCode(),retry.body());assertEquals(0,json.readTree(retry.body()).path("result").path("created").asInt());assertEquals(1,json.readTree(retry.body()).path("result").path("skipped").asInt());
        var query=HttpRequest.newBuilder(URI.create(base()+"/patients/query")).header("Content-Type","application/json").header("Jwttoken",token).POST(HttpRequest.BodyPublishers.ofString("{\"page\":0,\"size\":500,\"source_scene\":\"DISCHARGE\"}")).build();var rows=json.readTree(http.send(query,HttpResponse.BodyHandlers.ofString()).body()).path("result").path("items");boolean found=false;for(var row:rows)if(row.path("hospital_patient_id").asText().equals("E:"+key)){var detail=HttpRequest.newBuilder(URI.create(base()+"/patients/"+row.path("id").asLong())).header("Jwttoken",token).GET().build();assertEquals("00000000016",json.readTree(http.send(detail,HttpResponse.BodyHandlers.ofString()).body()).path("result").path("phone").asText());found=true;}assertTrue(found);
    }
    @Test void invalidRowRejectsWholeBatchAndBadFileTypeIsRejected()throws Exception{
        String token=login("manager"),key=UUID.randomUUID().toString();assertEquals(400,upload(token,"patients.csv",csv(key)+"坏行,女,151,00000000017,全科,虚构原因,BAD\n",key,3).statusCode());
        assertEquals(1,json.readTree(upload(token,"patients.csv",csv(key),key,3).body()).path("result").path("created").asInt(),"valid earlier row must not have been committed");
        assertEquals(400,upload(token,"patients.xls",csv(key),UUID.randomUUID().toString(),3).statusCode());
        assertEquals(400,upload(token,"patients.csv","姓名,姓名\n甲,乙\n",UUID.randomUUID().toString(),3).statusCode());
    }
    @Test void excelAndLimitsAreEnforced()throws Exception {
        String token=login("manager"),key=UUID.randomUUID().toString();
        try(var book=new org.apache.poi.xssf.usermodel.XSSFWorkbook();var buffer=new java.io.ByteArrayOutputStream()) {
            var sheet=book.createSheet("患者信息");String[][] values={{"姓名","性别","年龄","联系电话","科室","病种/管理原因","来源编号","证件号","内部备注"},{"虚构Excel对象","女","48","00000000018","全科","虚构原因",key,"00000000000000000X","虚构内部备注"}};
            for(int i=0;i<values.length;i++)for(int j=0;j<values[i].length;j++){var row=sheet.getRow(i);if(row==null)row=sheet.createRow(i);row.createCell(j).setCellValue(values[i][j]);}
            book.write(buffer);var result=uploadBytes(token,"patients.xlsx",buffer.toByteArray(),key,3);assertEquals(200,result.statusCode(),result.body());assertEquals(1,json.readTree(result.body()).path("result").path("created").asInt());
            sheet.getRow(1).getCell(2).setCellFormula("40+8");buffer.reset();book.write(buffer);assertEquals(400,uploadBytes(token,"formula.xlsx",buffer.toByteArray(),UUID.randomUUID().toString(),3).statusCode());
        }
        assertEquals(413,uploadBytes(token,"large.csv",new byte[5*1024*1024+1],UUID.randomUUID().toString(),3).statusCode());
        assertEquals(400,upload(token,"many.csv",csv(key)+"虚构对象,男,51,00000000019,全科,虚构原因,N\n".repeat(500),UUID.randomUUID().toString(),3).statusCode());
    }
    @Test void directUploadUsesExistingRoleAndAssignmentGates()throws Exception{
        for(String user:List.of("doctor","platform"))assertEquals(403,upload(login(user),"patients.csv",csv(UUID.randomUUID().toString()),UUID.randomUUID().toString(),3).statusCode());
        assertEquals(403,upload(login("operator_a"),"patients.csv",csv("OWNER"),UUID.randomUUID().toString(),4).statusCode());
        assertEquals(401,upload(null,"patients.csv",csv("NOAUTH"),UUID.randomUUID().toString(),3).statusCode());
    }
}
