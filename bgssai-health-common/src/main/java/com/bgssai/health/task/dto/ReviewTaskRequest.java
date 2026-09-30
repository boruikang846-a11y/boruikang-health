package com.bgssai.health.task.dto;
import jakarta.validation.constraints.*;
/** Submitted by the responsible doctor; reviewer and review time are taken from the session, never from the body. */
public record ReviewTaskRequest(@NotNull @Positive Long id,@NotNull @Min(0) Integer version,@NotNull Boolean approved,
    @Size(max=6000) String approvedText,@Size(max=2000) String reviewNote) {}
