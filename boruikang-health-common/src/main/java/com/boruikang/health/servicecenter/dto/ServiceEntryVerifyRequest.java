package com.boruikang.health.servicecenter.dto;
import jakarta.validation.constraints.*;
public record ServiceEntryVerifyRequest(@NotNull @Positive Long id,@NotNull @Min(0) Integer version,@NotNull @Positive Long patientId,@NotBlank @Size(max=1000) String evidence) {}
