package com.bgssai.health.task.dto;
import jakarta.validation.constraints.*;
public record AcknowledgeTaskRequest(@NotNull @Positive Long id,@NotNull @Min(0) Integer version,
    @NotBlank @Size(max=2000) String feedback) {}
