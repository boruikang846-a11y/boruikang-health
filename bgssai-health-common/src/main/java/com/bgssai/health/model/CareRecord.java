package com.bgssai.health.model;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
public class CareRecord extends BaseRow {
    public Long hospitalId;
    public Long patientId;
    public String recordType;
    public LocalDateTime occurredAt;
    public String content;
    public Integer medicationCycleDays;
    public LocalDate nextVisitDate;
    public BigDecimal systolic;
    public BigDecimal diastolic;
    public BigDecimal heartRate;
    public BigDecimal weight;
    public BigDecimal glucose;
    public Boolean needsContact;
    public String sourceSystem;
    public String externalId;
    public java.time.LocalDateTime doctorViewedAt;
    public Long doctorViewerId;
    public String doctorOpinion;
}
