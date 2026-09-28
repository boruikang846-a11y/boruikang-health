package com.bgssai.health.report.dto;
import java.time.LocalDate;
public record DailyMetric(LocalDate date,long dueCount,long completedCount) {}
