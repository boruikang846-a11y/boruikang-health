package com.boruikang.health.model;
import java.time.LocalDateTime;
public class WechatMessage extends BaseRow {
    public Long hospitalId;
    public Long contactId;
    public String channel;
    public String direction;
    public String kind;
    public String content;
    public String templateCode;
    public Long taskId;
    public String status;
    public String externalMsgId;
    public String error;
    public Long actorId;
    public LocalDateTime sentAt;
    public LocalDateTime handledAt;
    public Long handledBy;
    public Boolean mock;
    public String requestKey;
}
