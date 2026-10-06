package com.boruikang.health.model;
import java.time.LocalDateTime;
public class MessageLog extends BaseRow {
    public Long hospitalId;
    public Long patientId;
    public Long taskId;
    public String channel;
    public String templateCode;
    public String content;
    public LocalDateTime sentAt;
    public Long actorId;
    public String evidence;
    public String requestKey;
}
