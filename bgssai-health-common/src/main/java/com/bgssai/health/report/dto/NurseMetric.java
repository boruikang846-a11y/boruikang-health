package com.bgssai.health.report.dto;
public record NurseMetric(Long ownerId,String ownerName,String roleCode,long dueCount,long completedCount,
    long onTimeCount,Double completionRate,Double onTimeRate,long overdueCount,long contactPendingCount) {}
