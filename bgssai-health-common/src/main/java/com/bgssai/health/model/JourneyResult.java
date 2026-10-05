package com.bgssai.health.model;
import java.time.LocalDateTime;
public class JourneyResult extends BaseRow {
    public Long hospitalId;
    public Long patientId;
    public Long journeyId;
    public String requestId;
    public Long actorId;
    public String action;
    public String stepCode;
    public String evidence;
    public LocalDateTime occurredAt;
    public String payloadHash;
    public String responseJson;
    public Long referenceId;
    public String referenceType;
}
