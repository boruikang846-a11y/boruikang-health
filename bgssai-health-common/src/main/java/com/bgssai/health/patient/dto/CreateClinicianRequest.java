package com.bgssai.health.patient.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
public record CreateClinicianRequest(@NotBlank @Size(max=80) String name,@NotBlank @Size(max=80) String department) {}
