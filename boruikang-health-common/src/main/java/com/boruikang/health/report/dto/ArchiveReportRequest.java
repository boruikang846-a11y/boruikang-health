package com.boruikang.health.report.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
public record ArchiveReportRequest(@NotBlank @Pattern(regexp="DAILY|WEEKLY") String reportType,
    @NotNull LocalDate fromDate,@NotNull LocalDate toDate,@NotBlank @Size(max=2000) String summary,
    @NotBlank @Size(max=2000) String actionPlan) {}
