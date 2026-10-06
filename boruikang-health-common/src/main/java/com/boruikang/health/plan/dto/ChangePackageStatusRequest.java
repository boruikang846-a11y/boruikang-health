package com.boruikang.health.plan.dto;
import jakarta.validation.constraints.*;
public record ChangePackageStatusRequest(@NotNull @Positive Long id,@NotNull @Min(0) Integer version,@NotBlank @Pattern(regexp="ACTIVE|RETIRED") String status) {}
