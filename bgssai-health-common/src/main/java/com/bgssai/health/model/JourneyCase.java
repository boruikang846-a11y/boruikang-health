package com.bgssai.health.model;
import java.time.LocalDateTime;
public class JourneyCase extends BaseRow {
    public Long hospitalId;
    public Long patientId;
    public Long journeyId;
    public String kind;
    public String status;
    public String summary;
    public LocalDateTime dueAt;
    public Long ownerId;
    public Long doctorId;
    public String resolution;
    public String receiptEvidence;
    public Integer version;
}
