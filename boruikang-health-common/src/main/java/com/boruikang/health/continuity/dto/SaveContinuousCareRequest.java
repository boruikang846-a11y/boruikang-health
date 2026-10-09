package com.boruikang.health.continuity.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
public record SaveContinuousCareRequest(Long id, Integer version, @NotNull Long patientId, @NotBlank @Size(max=2000) String baseline, @NotBlank @Size(max=2000) String goals, @NotBlank @Size(max=2000) String patientInstructions, @NotNull LocalDate nextReviewDate, @NotBlank @Size(max=2000) String evidence) {}
