package com.boruikang.health.report.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
public record MetricQueryRequest(@NotNull LocalDate fromDate,@NotNull LocalDate toDate,@Positive Long ownerId,@Positive Long campaignId) {}
