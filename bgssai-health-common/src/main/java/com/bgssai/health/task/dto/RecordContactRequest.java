package com.bgssai.health.task.dto;
import jakarta.validation.constraints.*;
public record RecordContactRequest(@NotNull @Positive Long id,@NotNull @Min(0) Integer version,
    @NotBlank @Size(max=1000) String evidence) {}
