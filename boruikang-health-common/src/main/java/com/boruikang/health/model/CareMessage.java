package com.boruikang.health.model;
public class CareMessage extends BaseRow {
    public Long hospitalId;
    public Long patientId;
    public Long taskId;
    public Long senderId;
    public String senderRole;
    public String direction;
    public String content;
}
