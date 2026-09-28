package com.bgssai.health.patient.dto;
import jakarta.validation.constraints.*;
public record UpdatePatientRequest(@NotNull @Positive Long id,@NotNull @Min(0) Integer version,
    @Positive Long doctorId,@Positive Long ownerId,@Pattern(regexp="ENROLLED|MANAGING|PAUSED|CLOSED") String lifecycle,
    @Pattern(regexp="UNKNOWN|LOW|MEDIUM|HIGH|CRITICAL") String riskLevel,@Size(max=400) String riskEvidence,@Size(max=2000) String note,@Positive Long servicePackageId) {}
