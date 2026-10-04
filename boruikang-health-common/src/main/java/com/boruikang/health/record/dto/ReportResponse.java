package com.boruikang.health.record.dto;
import java.time.LocalDate;
import java.time.LocalDateTime;
public record ReportResponse(Long id,Long patientId,String patientName,String department,String disease,String recordType,LocalDateTime occurredAt,
    String content,Integer medicationCycleDays,LocalDate nextVisitDate,String sourceSystem,String externalId,
    LocalDateTime doctorViewedAt,Long doctorViewerId,String doctorOpinion,LocalDateTime gmtCreate) {}
