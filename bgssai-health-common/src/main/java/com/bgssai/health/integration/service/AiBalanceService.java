package com.bgssai.health.integration.service;

import com.bgssai.health.auth.service.CurrentAccount;
import com.bgssai.health.common.Checks;
import com.bgssai.health.common.exception.BizException;
import com.bgssai.health.integration.dto.AiBalanceInfo;
import com.bgssai.health.integration.dto.AiBalanceResponse;
import com.bgssai.health.integration.dto.DeepseekBalanceResponse;
import com.bgssai.health.model.IntegrationConfig;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class AiBalanceService {
    private static final Logger log=LoggerFactory.getLogger(AiBalanceService.class);
    private static final String BALANCE_URL="https://api.deepseek.com/user/balance";
    private final IntegrationService integrations;
    private final ObjectMapper json;
    private final RestTemplate http;

    public AiBalanceService(IntegrationService integrations,ObjectMapper json,RestTemplate http) {
        this.integrations=integrations;this.json=json;this.http=http;
    }

    public AiBalanceResponse query() {
        String role=CurrentAccount.get().roleCode();
        Checks.permit("MANAGER".equals(role)||"PLATFORM_ADMIN".equals(role));
        log.info("query DeepSeek balance actorId={}",CurrentAccount.get().userId());
        IntegrationConfig config=integrations.aiConfig();
        Checks.require(config!=null&&IntegrationService.endpointAllowed(config.endpoint)&&Checks.text(config.secret),
            "请先在接入设置保存 DeepSeek API Key，再查询余额");
        HttpHeaders headers=new HttpHeaders();
        headers.setBearerAuth(config.secret);headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        try {
            var response=http.exchange(BALANCE_URL,HttpMethod.GET,new HttpEntity<Void>(headers),String.class);
            String body=response.getBody();
            if(!response.getStatusCode().is2xxSuccessful()||body==null||body.length()>100000)throw invalidResponse();
            DeepseekBalanceResponse balance=json.readValue(body,DeepseekBalanceResponse.class);
            if(balance==null||balance.isAvailable()==null||balance.balanceInfos()==null||balance.balanceInfos().isEmpty())throw invalidResponse();
            for(AiBalanceInfo item:balance.balanceInfos()) {
                if(item==null||!("CNY".equals(item.currency())||"USD".equals(item.currency()))
                    ||!amount(item.totalBalance())||!amount(item.grantedBalance())||!amount(item.toppedUpBalance()))throw invalidResponse();
            }
            log.info("DeepSeek balance query succeeded actorId={}",CurrentAccount.get().userId());
            return new AiBalanceResponse(balance.isAvailable(),List.copyOf(balance.balanceInfos()),LocalDateTime.now());
        } catch(RestClientResponseException ex) {
            int status=ex.getStatusCode().value();
            log.warn("DeepSeek balance query rejected status={}",status);
            String message=switch(status) {
                case 401,403 -> "DeepSeek API Key 无效或无权查询余额，请检查配置";
                case 429 -> "DeepSeek 余额查询过于频繁，请稍后刷新";
                default -> "DeepSeek 余额服务暂时不可用，请稍后刷新";
            };
            throw new BizException("502000",message);
        } catch(ResourceAccessException ex) {
            log.warn("DeepSeek balance connection failed type={}",ex.getClass().getSimpleName());
            throw new BizException("502000","DeepSeek 余额查询超时或网络不可用，请稍后刷新");
        } catch(JsonProcessingException|RestClientException ex) {
            log.warn("DeepSeek balance query failed type={}",ex.getClass().getSimpleName());
            throw new BizException("502000","DeepSeek 余额查询失败，请稍后刷新");
        }
    }

    private static boolean amount(String value) {
        return value!=null&&value.length()<=64&&value.matches("-?\\d+(\\.\\d+)?");
    }

    private static BizException invalidResponse() {
        log.warn("DeepSeek balance response incomplete or invalid");
        return new BizException("502000","DeepSeek 余额返回异常，请稍后刷新");
    }
}
