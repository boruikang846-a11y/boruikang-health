package com.bgssai.health.knowledge.dto;
import jakarta.validation.constraints.*;
public record PublishKnowledgeRequest(@NotNull @Positive Long id,@NotNull @Min(1) Integer version,
    @NotNull @Positive Long reviewerId,
    @NotBlank @Pattern(regexp="PHONE|IN_PERSON|HOSPITAL_SYSTEM|SIGNED_DOCUMENT|MANUAL_OTHER") String reviewChannel,
    @NotBlank @Size(max=1000) String reviewEvidence,@NotNull java.time.LocalDateTime reviewedAt) {}
