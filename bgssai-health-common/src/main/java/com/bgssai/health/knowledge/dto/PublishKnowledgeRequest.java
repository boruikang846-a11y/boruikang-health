package com.bgssai.health.knowledge.dto;
import jakarta.validation.constraints.*;
public record PublishKnowledgeRequest(@NotNull @Positive Long id,@NotNull @Min(1) Integer version) {}
