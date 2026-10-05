package com.boruikang.health.model;
public class IntegrationConfig extends BaseRow {
    public Long hospitalId;
    public String provider;
    public String endpoint;
    public String modelName;
    public String secret;
    public Boolean enabled;
    public String appId;
    public String callbackToken;
    public String aesKey;
    public String channelMode;
    public String verifyStatus;
    public java.time.LocalDateTime verifiedAt;
    public String lastError;
}
