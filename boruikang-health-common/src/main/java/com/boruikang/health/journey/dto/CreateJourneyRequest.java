package com.boruikang.health.journey.dto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
import java.util.List;
import com.boruikang.health.plan.dto.PlanNodeDto;
public record CreateJourneyRequest(@NotNull @Positive Long patientId,@NotBlank @Pattern(regexp="OUTPATIENT|DISCHARGE") String kind,@Pattern(regexp="FULL|AFTER_CARE") String entryPhase,@NotBlank @Pattern(regexp="MANUAL|HOSPITAL_MOCK") String sourceSystem,@NotBlank @Size(max=120) String eventKey,@NotNull @PastOrPresent LocalDateTime eventAt,@NotBlank @Size(max=1000) String identityEvidence,@NotBlank @Size(max=1000) String handoffEvidence,@NotBlank @Pattern(regexp="[a-zA-Z0-9-]{1,80}") String requestId) {}
