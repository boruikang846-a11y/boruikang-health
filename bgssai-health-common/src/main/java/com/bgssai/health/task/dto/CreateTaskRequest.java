package com.bgssai.health.task.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
public record CreateTaskRequest(@NotNull @Positive Long patientId,@NotBlank @Pattern(regexp="FOLLOWUP|CONSULTATION|ALERT|REVISIT") String taskType,
    @NotBlank @Size(max=160) String title,@NotBlank @Pattern(regexp="P0|P1|P2|P3") String priority,
    @NotNull LocalDateTime dueAt,@Positive Long recordId,@Positive Long sopId,@NotBlank @Size(max=80) String requestKey) {}
