package com.boruikang.health.integration.dto;
import java.time.LocalDateTime;
/** AI rows leave the WeChat fields empty. Secrets, callback tokens and AES keys are never part of a response. */
public record IntegrationResponse(String provider,String endpoint,String modelName,boolean enabled,boolean configured,String status,
    String appId,String mode,boolean callbackReady,String callbackPath,LocalDateTime verifiedAt,String lastError,boolean mockAllowed) {
    public IntegrationResponse(String provider,String endpoint,String modelName,boolean enabled,boolean configured,String status) { this(provider,endpoint,modelName,enabled,configured,status,null,null,false,null,null,null,false); }
}
