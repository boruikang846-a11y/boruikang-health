package com.boruikang.health.patient.dto;
import jakarta.validation.constraints.*;
public record TimelineQueryRequest(@NotNull @Positive Long patientId,@Min(1) @Max(200) Integer limit) {}
