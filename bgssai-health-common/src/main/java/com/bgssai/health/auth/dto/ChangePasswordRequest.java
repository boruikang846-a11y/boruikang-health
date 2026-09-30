package com.bgssai.health.auth.dto;
import jakarta.validation.constraints.*;
public record ChangePasswordRequest(@NotBlank @Size(max=200) String oldPassword,@NotBlank @Size(min=8,max=64) String newPassword) {}
