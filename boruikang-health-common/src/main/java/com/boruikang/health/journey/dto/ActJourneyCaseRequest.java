package com.boruikang.health.journey.dto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
import java.util.List;
import com.boruikang.health.plan.dto.PlanNodeDto;
public record ActJourneyCaseRequest(@NotNull @Positive Long id,@NotNull @Min(0) Integer version,@NotBlank @Pattern(regexp="[a-zA-Z0-9-]{1,80}") String requestId,@NotNull @Positive Long caseId,@NotBlank @Pattern(regexp="ACCEPT|RESOLVE|CLOSE") String action,@NotBlank @Size(max=2000) String evidence) {}
