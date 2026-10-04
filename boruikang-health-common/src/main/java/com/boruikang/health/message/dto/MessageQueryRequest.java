package com.boruikang.health.message.dto;
import jakarta.validation.constraints.*;
public record MessageQueryRequest(@Min(0) Integer page,@Min(1) Integer size,@NotNull @Positive Long patientId) {}
