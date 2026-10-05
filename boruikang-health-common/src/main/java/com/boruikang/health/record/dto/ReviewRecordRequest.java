package com.boruikang.health.record.dto;
import jakarta.validation.constraints.*;
/** The responsible doctor confirms a report as read; the opinion is optional the first time and required when updating. */
public record ReviewRecordRequest(@NotNull @Positive Long id,@Size(max=2000) String opinion) {}
