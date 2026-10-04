package com.boruikang.health.auth.dto;
import jakarta.validation.constraints.*;
public record LoginRequest(@NotBlank @Size(max=64) String identifier, @NotBlank @Size(max=200) String password) {}
