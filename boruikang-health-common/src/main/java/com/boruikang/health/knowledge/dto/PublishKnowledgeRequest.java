package com.boruikang.health.knowledge.dto;
import jakarta.validation.constraints.*;
/** A doctor publishes a draft after reading it; reviewer and time come from the session. */
public record PublishKnowledgeRequest(@NotNull @Positive Long id,@NotNull @Min(1) Integer version) {}
