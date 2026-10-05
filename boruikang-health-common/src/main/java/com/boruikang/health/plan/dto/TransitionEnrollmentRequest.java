package com.boruikang.health.plan.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
public record TransitionEnrollmentRequest(@NotNull @Positive Long id,@NotNull @Min(0) Integer version,@NotBlank @Pattern(regexp="ACTIVATE|CLOSE|UPGRADE|EXPIRE") String action,
    LocalDate startDate,@Size(max=400) String reason,@Positive Long upgradePackageId,@Size(max=60) String upgradeOrderNo) {}
