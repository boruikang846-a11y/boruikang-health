package com.boruikang.health.model;
import java.time.LocalDateTime;
public class ScreeningRecord extends BaseRow {
    public Long hospitalId;
    public Long patientId;
    public Long orgId;
    public Long campaignId;
    public Long ownerId;
    public String sourceType;
    public String name;
    public String gender;
    public Integer age;
    public String phone;
    public String idCardTail;
    public LocalDateTime screenedAt;
    public String finding;
    public String category;
    public String riskLevel;
    public String riskEvidence;
    public Long judgedBy;
    public LocalDateTime judgedAt;
    public String poolStatus;
    public String nonHighRiskReason;
    public String externalId;
    public String importBatch;
    public String note;
    public Integer version;
}
