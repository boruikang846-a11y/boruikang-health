package com.boruikang.health.continuity.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
public record ReviewContinuousCareRequest(@NotNull Long id, @NotNull Integer version, Long journeyId, @NotBlank @Size(max=2000) String summary, @NotBlank @Size(max=2000) String evidence, @NotBlank @Size(max=2000) String patientMessage, @NotNull @Pattern(regexp="ON_TRACK|NEEDS_ADJUSTMENT|UNKNOWN") String assessment, @NotNull LocalDate nextReviewDate) {}
