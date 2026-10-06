package com.boruikang.health.model;
public class AuditEvent extends BaseRow {
    public Long hospitalId;
    public Long patientId;
    public Long actorId;
    public String action;
    public Long resourceId;
    public String beforeState;
    public String afterState;
    public String detail;
}
