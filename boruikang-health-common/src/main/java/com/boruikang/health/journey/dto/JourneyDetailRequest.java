package com.boruikang.health.journey.dto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
import java.util.List;
import com.boruikang.health.plan.dto.PlanNodeDto;
public record JourneyDetailRequest(@NotNull @Positive Long id) {}
