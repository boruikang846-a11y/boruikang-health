package com.bgssai.health.task.dto;
import jakarta.validation.constraints.*;
public record TaskQueryRequest(@Min(0) Integer page,@Min(1) Integer size,@Positive Long patientId,
    @Pattern(regexp="FOLLOWUP|CONSULTATION|ALERT|REVISIT") String taskType,@Size(max=24) String status,
    @Pattern(regexp="P0|P1|P2|P3") String priority,Boolean overdue) {}
