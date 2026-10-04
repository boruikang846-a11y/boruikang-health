package com.boruikang.health.record.dto;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
public record RecordResponse(Long id,Long patientId,String recordType,LocalDateTime occurredAt,String content,Integer medicationCycleDays,
    LocalDate nextVisitDate,BigDecimal systolic,BigDecimal diastolic,BigDecimal heartRate,BigDecimal weight,BigDecimal glucose,
    Boolean needsContact,String sourceSystem,LocalDateTime gmtCreate,String externalId,
    LocalDateTime doctorViewedAt,Long doctorViewerId,String doctorOpinion) {}
