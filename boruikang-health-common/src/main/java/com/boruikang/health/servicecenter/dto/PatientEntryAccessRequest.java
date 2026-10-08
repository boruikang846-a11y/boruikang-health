package com.boruikang.health.servicecenter.dto;
import jakarta.validation.constraints.*;
public record PatientEntryAccessRequest(@NotBlank @Pattern(regexp="[A-Za-z0-9_-]{43}") String token) {}
