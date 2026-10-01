package com.bgssai.health.integration.service;

import com.bgssai.health.auth.dto.AccountInfo;
import com.bgssai.health.auth.service.CurrentAccount;
import com.bgssai.health.common.exception.BizException;
import com.bgssai.health.model.IntegrationConfig;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.*;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import java.nio.charset.StandardCharsets;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AiBalanceServiceTest {
    private static final String URL="https://api.deepseek.com/user/balance";
    private static final String BODY="""
        {"is_available":true,"balance_infos":[
          {"currency":"CNY","total_balance":"110.0001","granted_balance":"10.0001","topped_up_balance":"100.00","extra":"ignored"},
          {"currency":"USD","total_balance":"2.05","granted_balance":"0.00","topped_up_balance":"2.05"}],"extra":"ignored"}
        """;
    private final IntegrationService integrations=mock(IntegrationService.class);
    private final RestTemplate http=mock(RestTemplate.class);
    private AiBalanceService service;
    private IntegrationConfig config;

    @BeforeEach void setup() {
        CurrentAccount.set(new AccountInfo(1L,"Manager","MANAGER",1L));
        var json=new ObjectMapper().setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE);
        service=new AiBalanceService(integrations,json,http);
        config=new IntegrationConfig();config.endpoint=IntegrationService.DEEPSEEK;config.secret="saved-test-key";config.enabled=false;
        when(integrations.aiConfig()).thenReturn(config);
    }
    @AfterEach void cleanup() { CurrentAccount.clear(); }

    @Test void getsSavedAccountBalanceWhileGenerationIsDisabled() {
        when(http.exchange(eq(URL),eq(HttpMethod.GET),any(HttpEntity.class),eq(String.class))).thenAnswer(invocation->{
            HttpEntity<?> request=invocation.getArgument(2);
            assertEquals("Bearer saved-test-key",request.getHeaders().getFirst("Authorization"));
            assertNull(request.getBody());return ResponseEntity.ok(BODY);
        });
        var result=service.query();assertTrue(result.isAvailable());assertNotNull(result.checkedAt());
        assertEquals(2,result.balanceInfos().size());assertEquals("110.0001",result.balanceInfos().getFirst().totalBalance());
        assertEquals("USD",result.balanceInfos().get(1).currency());assertEquals("2.05",result.balanceInfos().get(1).toppedUpBalance());
        assertFalse(config.enabled);assertFalse(result.toString().contains(config.secret));
    }
    @Test void zeroBalanceIsAValidResponse() {
        when(http.exchange(eq(URL),eq(HttpMethod.GET),any(HttpEntity.class),eq(String.class)))
            .thenReturn(ResponseEntity.ok("{\"is_available\":false,\"balance_infos\":[{\"currency\":\"CNY\",\"total_balance\":\"0.00\",\"granted_balance\":\"0.00\",\"topped_up_balance\":\"0.00\"}]}"));
        assertFalse(service.query().isAvailable());
    }
    @Test void missingOrOtherProviderKeysNeverCallTheNetwork() {
        config.secret="";assertThrows(BizException.class,()->service.query());
        config.secret="saved-test-key";config.endpoint="https://other.example/chat/completions";
        assertThrows(BizException.class,()->service.query());
        when(integrations.aiConfig()).thenReturn(null);assertThrows(BizException.class,()->service.query());
        verifyNoInteractions(http);
    }
    @Test void staffWithoutConfigurationPermissionCannotReadTheKeyOrBalance() {
        clearInvocations(integrations);
        for(String role:List.of("DOCTOR","NURSE","OPERATOR","USER")) {
            CurrentAccount.set(new AccountInfo(3L,"Staff",role,1L));
            assertEquals("4003",assertThrows(BizException.class,()->service.query()).getCode());
        }
        verifyNoInteractions(integrations,http);
    }
    @Test void upstreamErrorsAreSanitizedAndNeverBecomeLoginFailures() {
        for(int status:List.of(401,403,429,500)) {
            when(http.exchange(eq(URL),eq(HttpMethod.GET),any(HttpEntity.class),eq(String.class)))
                .thenThrow(HttpClientErrorException.create(HttpStatusCode.valueOf(status),"upstream",HttpHeaders.EMPTY,
                    "saved-test-key private provider response".getBytes(StandardCharsets.UTF_8),StandardCharsets.UTF_8));
            BizException error=assertThrows(BizException.class,()->service.query());
            assertEquals("502000",error.getCode());assertFalse(error.getMessage().contains("saved-test-key"));
            assertFalse(error.getMessage().contains("private provider response"));
            assertTrue(error.getMessage().contains(status==429?"频繁":status==401||status==403?"Key":"不可用"));
        }
    }
    @Test void networkTimeoutIsReportedWithoutLeakingTheCause() {
        when(http.exchange(eq(URL),eq(HttpMethod.GET),any(HttpEntity.class),eq(String.class)))
            .thenThrow(new ResourceAccessException("saved-test-key timeout"));
        BizException error=assertThrows(BizException.class,()->service.query());
        assertEquals("502000",error.getCode());assertTrue(error.getMessage().contains("超时"));assertFalse(error.getMessage().contains(config.secret));
    }
    @Test void malformedOrIncompleteBalancesAreNotReportedAsZero() {
        for(String body:List.of("not-json","null","{}","{\"is_available\":true,\"balance_infos\":[]}",
            BODY.replace("110.0001","NaN"),BODY.replace("\"is_available\":true,",""),BODY.replace("CNY","UNKNOWN"),BODY.replace("\"total_balance\":\"110.0001\",",""))) {
            when(http.exchange(eq(URL),eq(HttpMethod.GET),any(HttpEntity.class),eq(String.class))).thenReturn(ResponseEntity.ok(body));
            assertEquals("502000",assertThrows(BizException.class,()->service.query()).getCode());
        }
    }
}
