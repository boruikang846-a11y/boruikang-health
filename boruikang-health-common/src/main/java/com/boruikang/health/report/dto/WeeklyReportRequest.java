package com.boruikang.health.report.dto;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
public record WeeklyReportRequest(@NotNull LocalDate fromDate,@NotNull LocalDate toDate) {}
