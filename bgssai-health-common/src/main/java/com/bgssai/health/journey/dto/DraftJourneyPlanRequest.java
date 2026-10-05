package com.bgssai.health.journey.dto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
import java.util.List;
import com.bgssai.health.plan.dto.PlanNodeDto;
public record DraftJourneyPlanRequest(@NotNull @Positive Long id,@NotNull @Min(0) Integer version,@NotBlank @Pattern(regexp="[a-zA-Z0-9-]{1,80}") String requestId,@NotBlank @Size(max=6000) String planText,@Positive Long recordId,@Positive Long templateId,@NotEmpty @Size(max=60) List<@NotNull @Valid PlanNodeDto> nodes,@NotBlank @Size(max=2000) String evidence) {}
