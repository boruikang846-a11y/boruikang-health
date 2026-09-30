package com.bgssai.health.screening.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
public record ScreeningQueryRequest(@Min(0) Integer page,@Min(1) Integer size,@Size(max=80) String keyword,
    @Pattern(regexp="ECG_NETWORK|EXAM|HEALTH_SCREENING|STROKE_SCREENING|OUTPATIENT|INPATIENT|CAMPAIGN") String sourceType,
    @Pattern(regexp="NEW|HIGH_RISK|NON_HIGH_RISK|ENROLLED|DISCARDED") String poolStatus,@Pattern(regexp="UNKNOWN|LOW|MEDIUM|HIGH|CRITICAL") String riskLevel,
    @Positive Long orgId,@Positive Long campaignId,@Positive Long ownerId,LocalDate screenedFrom,LocalDate screenedTo,@Size(max=60) String importBatch) {}
