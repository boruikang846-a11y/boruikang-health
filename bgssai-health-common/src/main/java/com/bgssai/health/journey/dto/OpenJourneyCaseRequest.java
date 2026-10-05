package com.bgssai.health.journey.dto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
import java.util.List;
import com.bgssai.health.plan.dto.PlanNodeDto;
public record OpenJourneyCaseRequest(@NotNull @Positive Long id,@NotNull @Min(0) Integer version,@NotBlank @Pattern(regexp="[a-zA-Z0-9-]{1,80}") String requestId,@NotBlank @Pattern(regexp="SERVICE|CLINICAL|COMPLAINT") String kind,@NotBlank @Size(max=2000) String summary,@NotNull @Future LocalDateTime dueAt,@NotBlank @Size(max=2000) String evidence) {}
