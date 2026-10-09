package com.boruikang.health.continuity.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
public record LinkContinuousJourneyRequest(@NotNull Long id, @NotNull Integer version, @NotNull Long journeyId, @NotBlank @Size(max=2000) String evidence) {}
