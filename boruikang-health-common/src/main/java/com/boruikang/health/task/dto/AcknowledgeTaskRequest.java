package com.boruikang.health.task.dto;
import jakarta.validation.constraints.*;
/** The responsible doctor's receipt of a completed follow-up. */
public record AcknowledgeTaskRequest(@NotNull @Positive Long id,@NotNull @Min(0) Integer version,@NotBlank @Size(max=2000) String feedback) {}
