package com.bgssai.health.model;
import java.time.LocalDate;
import java.time.LocalDateTime;
public class ServiceEnrollment extends BaseRow {
    public Long hospitalId;
    public Long patientId;
    public Long packageId;
    public String orderNo;
    public LocalDateTime signedAt;
    public LocalDate startDate;
    public LocalDate endDate;
    public String status;
    public LocalDateTime activatedAt;
    public Long activatedBy;
    public LocalDateTime consentAt;
    public String consentEvidence;
    public String summary;
    public LocalDateTime closedAt;
    public String closeReason;
    public Long upgradeToId;
    public String requestKey;
    public Integer version;
}
