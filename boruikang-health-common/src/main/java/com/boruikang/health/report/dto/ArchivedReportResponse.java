package com.boruikang.health.report.dto;
import java.time.LocalDate;
import java.time.LocalDateTime;
public record ArchivedReportResponse(Long id,Long ownerId,String reportType,LocalDate fromDate,LocalDate toDate,
    String summary,String actionPlan,WeeklyReportResponse snapshot,String deliveryEvidence,LocalDateTime deliveredAt,
    Integer version,LocalDateTime createdAt) {}
