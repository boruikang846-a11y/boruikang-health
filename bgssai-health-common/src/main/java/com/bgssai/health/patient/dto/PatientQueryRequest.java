package com.bgssai.health.patient.dto;
import jakarta.validation.constraints.*;
public record PatientQueryRequest(@Min(0) Integer page,@Min(1) Integer size,@Size(max=80) String keyword,
    @Size(max=16) String riskLevel,@Size(max=80) String department) {}
