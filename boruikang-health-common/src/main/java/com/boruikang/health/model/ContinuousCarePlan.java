package com.boruikang.health.model;
import java.time.LocalDate;
import java.time.LocalDateTime;
public class ContinuousCarePlan extends BaseRow {
 public String consentKey;
    public Long hospitalId;
    public Long patientId;
    public String diseaseCode;
    public String status;
    public String approvalStatus;
    public String baseline;
    public String goals;
    public String patientInstructions;
    public LocalDate nextReviewDate;
    public Integer revision;
    public Long reviewerId;
    public LocalDateTime reviewedAt;
    public Integer version;
}
