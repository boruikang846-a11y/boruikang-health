package com.boruikang.health.journey.dto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
import java.util.List;
import com.boruikang.health.plan.dto.PlanNodeDto;
public record JourneyStatusRequest(@NotNull @Positive Long id,@NotNull @Min(0) Integer version,@NotBlank @Pattern(regexp="[a-zA-Z0-9-]{1,80}") String requestId,@NotBlank @Pattern(regexp="PAUSE|RESUME|EXIT|HANDOFF|WITHDRAW") String action,@NotBlank @Size(max=2000) String evidence) {}
