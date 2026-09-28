package com.bgssai.health.task.dto;
import jakarta.validation.constraints.*;
public record ReviewTaskRequest(@NotNull @Positive Long id,@NotNull @Min(0) Integer version,@NotNull Boolean approved,
    @Size(max=6000) String approvedText,@Size(max=2000) String reviewNote) {}
