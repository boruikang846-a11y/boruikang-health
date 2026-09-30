package com.bgssai.health.report.dto;
public record OperatorMetric(Long ownerId,String ownerName,String roleCode,long managed,long highRisk,long invited,long reachedPatients,long invitedPatients,Double reachRate,long booked,long effectiveArrived,Double arrivalRate,
    long followupDue,long followupDone,Double followupRate,long overdue,long lost,String rating) {}
