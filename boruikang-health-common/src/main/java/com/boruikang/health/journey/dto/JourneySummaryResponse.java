package com.boruikang.health.journey.dto;
public record JourneySummaryResponse(long activeCount,long handoffCount,long pendingPlanCount,long openCaseCount,long overdueCaseCount) {}
