package com.boruikang.health.model;
import java.time.LocalDateTime;
public class InterventionLog extends BaseRow {
    public Long hospitalId;
    public Long patientId;
    public Long workId;
    public Long actorId;
    public String action;
    public String note;
    public String beforeJson;
    public String afterJson;
}
