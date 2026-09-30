package com.bgssai.health.report.dto;
import java.time.LocalDateTime;
/** Counts for the responsible doctor's own patients. */
public record DoctorWorkbenchResponse(long patientCount,long highRiskCount,long pendingReviewCount,long unreadReportCount,
    long pendingResultCount,long escalatedAlertCount,LocalDateTime asOf) {}
