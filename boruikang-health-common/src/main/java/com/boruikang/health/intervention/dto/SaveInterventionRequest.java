package com.boruikang.health.intervention.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
public record SaveInterventionRequest(@Positive Long id,@Min(0) Integer version,@NotNull @Positive Long patientId,@NotBlank @Pattern(regexp="OUTPATIENT|INPATIENT|EXAM|CONSULTATION|REFERRAL") String center,@NotBlank @Pattern(regexp="PRE|IN|POST") String phase,@NotBlank @Size(max=40) String category,@NotBlank @Size(max=160) String title,@NotBlank @Size(max=4000) String content,@NotNull Boolean clinical,@Positive Long recordId,@NotNull LocalDateTime dueAt,@NotBlank @Size(max=2000) String reason) {}
