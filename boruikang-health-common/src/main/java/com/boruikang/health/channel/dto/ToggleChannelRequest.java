package com.boruikang.health.channel.dto;
import jakarta.validation.constraints.*;
public record ToggleChannelRequest(@NotNull @Positive Long id,@NotNull Boolean active) {}
