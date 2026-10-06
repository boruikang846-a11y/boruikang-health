package com.boruikang.health.journey.dto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
import java.util.List;
import com.boruikang.health.plan.dto.PlanNodeDto;
public record ReviewJourneyPlanRequest(@NotNull @Positive Long id,@NotNull @Min(0) Integer version,@NotBlank @Pattern(regexp="[a-zA-Z0-9-]{1,80}") String requestId,@NotNull @Positive Long planId,@NotNull Boolean approved,@NotBlank @Size(max=2000) String reviewNote,@NotBlank @Size(max=2000) String evidence) {}
