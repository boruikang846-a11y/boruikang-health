package com.bgssai.health.task.dto;
import jakarta.validation.constraints.*;
public record DraftTaskRequest(@NotNull @Positive Long id,@NotNull @Min(0) Integer version,@Positive Long knowledgeId,
    @NotBlank @Pattern(regexp="TEMPLATE|AI|MANUAL") String mode,@Size(max=6000) String draftText) {}
