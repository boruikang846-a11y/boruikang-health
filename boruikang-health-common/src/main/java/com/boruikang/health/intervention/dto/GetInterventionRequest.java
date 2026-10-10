package com.boruikang.health.intervention.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
public record GetInterventionRequest(@NotNull @Positive Long id) {}
