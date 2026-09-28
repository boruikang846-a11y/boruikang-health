package com.bgssai.health.auth.dto;
import jakarta.validation.constraints.*;
public record RegisterRequest(@NotBlank @Pattern(regexp="[a-zA-Z0-9_]{4,40}") String username,
    @NotBlank @Size(min=10,max=100) String password, @NotBlank @Size(max=80) String realName,
    @NotNull @AssertTrue Boolean consent) {}
