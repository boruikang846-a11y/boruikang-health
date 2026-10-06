package com.boruikang.health.account.dto;
import jakarta.validation.constraints.*;
public record ResetStaffPasswordRequest(@NotNull @Positive Long id,@NotBlank @Size(min=8,max=64) String password) {}
