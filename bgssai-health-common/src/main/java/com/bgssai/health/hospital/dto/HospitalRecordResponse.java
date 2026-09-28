package com.bgssai.health.hospital.dto;
import java.time.LocalDate;
import java.time.LocalDateTime;
public record HospitalRecordResponse(String externalId,String recordType,LocalDateTime occurredAt,String content,
    Integer medicationCycleDays,LocalDate nextVisitDate) {}
