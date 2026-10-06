package com.boruikang.health.account.dto;
import jakarta.validation.constraints.*;
public record ChangeStaffStatusRequest(@NotNull @Positive Long id,@NotNull Boolean enabled) {}
