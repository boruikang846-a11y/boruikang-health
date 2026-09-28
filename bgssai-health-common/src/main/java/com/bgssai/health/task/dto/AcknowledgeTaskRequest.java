package com.bgssai.health.task.dto;
import jakarta.validation.constraints.*;
public record AcknowledgeTaskRequest(@NotNull @Positive Long id,@NotNull @Min(0) Integer version,
    @NotBlank @Size(max=2000) String feedback,
    @NotBlank @Pattern(regexp="PHONE|IN_PERSON|HOSPITAL_SYSTEM|SIGNED_DOCUMENT|MANUAL_OTHER") String channel,
    @NotBlank @Size(max=1000) String evidence,@NotNull java.time.LocalDateTime acknowledgedAt) {}
