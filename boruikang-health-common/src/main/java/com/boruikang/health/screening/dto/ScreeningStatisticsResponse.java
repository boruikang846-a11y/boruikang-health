package com.boruikang.health.screening.dto;
import java.util.Map;
/** Counts screening records, not distinct patients; every count shares the caller's scope. */
public record ScreeningStatisticsResponse(long total,long pending,long highRisk,long critical,long enrolled,
    Map<String,Long> sources,Map<String,Long> risks) {}
