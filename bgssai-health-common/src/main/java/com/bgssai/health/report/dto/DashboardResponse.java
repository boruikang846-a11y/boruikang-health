package com.bgssai.health.report.dto;
import java.time.LocalDateTime;
import java.util.List;
public record DashboardResponse(long patientCount,long managingCount,long highRiskCount,long pendingTaskCount,long overdueCount,
    long reviewCount,long openAlertCount,long revisitCount,List<DailyMetric> daily,LocalDateTime asOf) {}
