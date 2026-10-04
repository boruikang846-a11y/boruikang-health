package com.boruikang.health.plan.dto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
public record SavePlanRequest(@Positive Long id,@Min(0) Integer version,@NotBlank @Size(max=120) String name,@NotBlank @Size(max=120) String disease,
    @NotBlank @Pattern(regexp="POST_VISIT|POST_DISCHARGE|POST_SURGERY|SCREENING|LONG_TERM") String entryScene,@Size(max=2000) String description,
    @NotEmpty @Size(max=60) List<@Valid PlanNodeDto> nodes) {}
