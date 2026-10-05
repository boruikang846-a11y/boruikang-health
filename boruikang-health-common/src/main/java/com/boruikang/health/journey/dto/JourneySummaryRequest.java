package com.boruikang.health.journey.dto;
import jakarta.validation.constraints.Positive;
public record JourneySummaryRequest(@Positive Long patientId) {}
