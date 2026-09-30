package com.bgssai.health.knowledge.dto;
import jakarta.validation.constraints.*;
public record SaveKnowledgeRequest(@Positive Long id,@NotBlank @Size(max=160) String title,
    @NotBlank @Pattern(regexp="EDUCATION|PACKAGE") String kind,@NotBlank @Size(max=80) String department,
    @NotBlank @Size(max=5000) String content,@NotBlank @Size(max=300) String source,@Min(1) Integer version,
    @Min(1) @Max(730) Integer serviceDays,@Min(1) @Max(365) Integer followupCount) {}
