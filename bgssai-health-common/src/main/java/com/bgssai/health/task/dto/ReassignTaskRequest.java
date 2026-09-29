package com.bgssai.health.task.dto;
import jakarta.validation.constraints.*;
public record ReassignTaskRequest(@NotNull @Positive Long id,@NotNull @Min(0) Integer version,@NotNull @Positive Long assigneeId,@NotBlank @Size(max=400) String reason) {}
