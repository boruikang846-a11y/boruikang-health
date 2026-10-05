package com.bgssai.health.journey.dto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
import java.util.List;
import com.bgssai.health.plan.dto.PlanNodeDto;
public record CompleteJourneyStepRequest(@NotNull @Positive Long id,@NotNull @Min(0) Integer version,@NotBlank @Pattern(regexp="[a-zA-Z0-9-]{1,80}") String requestId,@NotBlank @Pattern(regexp="CONSULT|ARRIVAL|IN_HOSPITAL|CLINICAL|DISCHARGE_HANDOFF|FOLLOWUP|CLOSE") String stepCode,@NotBlank @Size(max=2000) String evidence,@NotNull @PastOrPresent LocalDateTime occurredAt,@Positive Long appointmentId,@Positive Long recordId,@Pattern(regexp="VERIFIED|NONE") String outcome,@Pattern(regexp="RATED|DECLINED|NO_RESPONSE|NOT_INVITED") String satisfactionStatus,@Min(1) @Max(5) Integer satisfactionScore,@Size(max=2000) String feedback) {}
