package com.bgssai.health.model;
import java.time.LocalDateTime;
public class WechatContact extends BaseRow {
    public Long hospitalId;
    public String channel;
    public String externalId;
    public String unionId;
    public String nickname;
    public String staffUserId;
    public Long staffAccountId;
    public Long intakeChannelId;
    public String scene;
    public String relation;
    public LocalDateTime followedAt;
    public LocalDateTime removedAt;
    public LocalDateTime lastInboundAt;
    public LocalDateTime lastMessageAt;
    public String lastMessagePreview;
    public Integer pendingCount;
    public Long patientId;
    public LocalDateTime boundAt;
    public Long boundBy;
    public Boolean mock;
    public Integer version;
}
