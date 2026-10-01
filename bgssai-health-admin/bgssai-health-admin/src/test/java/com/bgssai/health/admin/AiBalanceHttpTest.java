package com.bgssai.health.admin;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={
    "spring.datasource.url=jdbc:h2:mem:health-ai-balance;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "logging.level.root=WARN"
})
class AiBalanceHttpTest {
    @Value("${local.server.port}") int port;
    @Autowired ObjectMapper json;
    @MockitoBean RestTemplate upstream;
    private final HttpClient http=HttpClient.newHttpClient();
    private static final String BALANCE="/integrations/ai/balance";
    private HttpResponse<String> request(String path,Object body,String token) throws Exception {
        var request=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/bgssai/admin"+path)).header("Content-Type","application/json");
        if(token!=null)request.header("Jwttoken",token);
        if(body!=null)request.POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
        return http.send(request.build(),HttpResponse.BodyHandlers.ofString());
    }
    private String login(String account) throws Exception {
        var response=request("/login",Map.of("identifier",account,"password","HealthDemo@2026!"),null);
        assertEquals(200,response.statusCode(),response.body());return json.readTree(response.body()).path("result").path("jwt_token").asText();
    }
    @Test void balanceApiChecksRolesAndUsesSavedKeyWithoutEnablingGeneration() throws Exception {
        assertEquals(401,request(BALANCE,null,null).statusCode());
        for(String account:List.of("doctor","nurse","operator_a"))assertEquals(403,request(BALANCE,null,login(account)).statusCode());
        String manager=login("manager"),platform=login("platform");
        assertEquals(400,request(BALANCE,null,manager).statusCode());verifyNoInteractions(upstream);
        String key="http-test-deepseek-key";
        assertEquals(200,request("/integrations/save",Map.of("provider","AI","endpoint","https://api.deepseek.com/chat/completions",
            "model_name","deepseek-flash","secret",key,"enabled",false),manager).statusCode());
        when(upstream.exchange(eq("https://api.deepseek.com/user/balance"),eq(HttpMethod.GET),any(HttpEntity.class),eq(String.class)))
            .thenReturn(ResponseEntity.ok("{\"is_available\":true,\"balance_infos\":[{\"currency\":\"CNY\",\"total_balance\":\"12.3456\",\"granted_balance\":\"2.3456\",\"topped_up_balance\":\"10.00\"}]}"));
        for(String token:List.of(manager,platform)) {
            var response=request(BALANCE,null,token);assertEquals(200,response.statusCode(),response.body());
            assertFalse(response.body().contains(key));JsonNode result=json.readTree(response.body()).path("result");
            assertTrue(result.path("is_available").asBoolean());assertTrue(result.path("checked_at").isTextual());
            assertEquals("12.3456",result.path("balance_infos").get(0).path("total_balance").asText());
        }
        when(upstream.exchange(eq("https://api.deepseek.com/user/balance"),eq(HttpMethod.GET),any(HttpEntity.class),eq(String.class)))
            .thenThrow(new HttpClientErrorException(HttpStatus.UNAUTHORIZED,"provider key rejected"));
        assertEquals(502,request(BALANCE,null,manager).statusCode());
        assertEquals(200,request("/me",null,manager).statusCode());
        JsonNode settings=json.readTree(request("/integrations",null,manager).body()).path("result").get(0);
        assertFalse(settings.path("enabled").asBoolean());assertTrue(settings.path("configured").asBoolean());
    }
}
