package com.bgssai.health.integration.dto;
import jakarta.validation.constraints.*;
public record SaveIntegrationRequest(@NotBlank @Pattern(regexp="AI") String provider,@NotBlank @Size(max=300) String endpoint,
    @NotBlank @Size(max=120) String modelName,@Size(max=2000) String secret,@NotNull Boolean enabled) {}
