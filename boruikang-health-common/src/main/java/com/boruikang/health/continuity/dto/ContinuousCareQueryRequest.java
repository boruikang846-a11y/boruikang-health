package com.boruikang.health.continuity.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
public record ContinuousCareQueryRequest(@NotNull Long patientId) {}
