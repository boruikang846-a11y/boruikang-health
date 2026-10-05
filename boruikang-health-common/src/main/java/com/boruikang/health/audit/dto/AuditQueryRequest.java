package com.boruikang.health.audit.dto;
import jakarta.validation.constraints.*;
public record AuditQueryRequest(@Min(0) Integer page,@Min(1) Integer size,@NotNull @Positive Long patientId) {}
