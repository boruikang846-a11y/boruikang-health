package com.boruikang.health.plan.dto;
import java.time.LocalDate;
import java.time.LocalDateTime;
public record EnrollmentResponse(Long id,Long patientId,String patientName,Long packageId,String packageName,String tier,String orderNo,LocalDateTime signedAt,LocalDate startDate,LocalDate endDate,
    String status,LocalDateTime activatedAt,Long activatedBy,LocalDateTime consentAt,String consentEvidence,String summary,LocalDateTime closedAt,String closeReason,Long upgradeToId,Integer version,
    long taskCount,long completedTaskCount,Integer remainingDays) {}
