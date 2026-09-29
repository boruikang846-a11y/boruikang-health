package com.bgssai.health.org.dto;
import jakarta.validation.constraints.*;
public record SaveSlaRequest(@NotBlank @Pattern(regexp="UNKNOWN|LOW|MEDIUM|HIGH|CRITICAL") String riskLevel,
    @NotNull @Min(1) @Max(720) Integer firstContactHours,@NotNull @Min(1) @Max(365) Integer bookingDays,@NotNull @Min(1) @Max(365) Integer arrivalDays,
    @NotNull @Min(1) @Max(20) Integer lostAfterAttempts,@Size(max=400) String note) {}
