package com.bgssai.health.medication.dto;
import jakarta.validation.constraints.*;
public record MedicationQueryRequest(@NotNull @Positive Long patientId,@Pattern(regexp="ACTIVE|STOPPED") String status) {}
