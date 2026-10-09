package com.boruikang.health.servicecenter.dto;
import jakarta.validation.constraints.*;
public record ServiceEntryRevokeRequest(@NotNull @Positive Long id,@NotNull @Min(0) Integer version,@NotBlank @Size(max=1000) String reason) {}
