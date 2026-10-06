package com.boruikang.health.common.dto;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
public record IdRequest(@NotNull @Positive Long id) {}
