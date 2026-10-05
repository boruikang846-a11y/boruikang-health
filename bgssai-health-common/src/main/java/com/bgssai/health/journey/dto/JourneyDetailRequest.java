package com.bgssai.health.journey.dto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
import java.util.List;
import com.bgssai.health.plan.dto.PlanNodeDto;
public record JourneyDetailRequest(@NotNull @Positive Long id) {}
