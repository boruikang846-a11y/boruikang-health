package com.bgssai.health.screening.dto;
import jakarta.validation.constraints.*;
public record JudgeScreeningRequest(@NotNull @Positive Long id,@NotNull @Min(0) Integer version,
    @NotBlank @Pattern(regexp="HIGH_RISK|NON_HIGH_RISK|DISCARDED") String poolStatus,
    @Pattern(regexp="UNKNOWN|LOW|MEDIUM|HIGH|CRITICAL") String riskLevel,@Size(max=400) String riskEvidence,
    @Size(max=200) String nonHighRiskReason,@Positive Long ownerId,@Size(max=1000) String note) {}
