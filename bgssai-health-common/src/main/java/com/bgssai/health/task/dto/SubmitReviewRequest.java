package com.bgssai.health.task.dto;
import jakarta.validation.constraints.*;
public record SubmitReviewRequest(@NotNull @Positive Long id,@NotNull @Min(0) Integer version) {}
