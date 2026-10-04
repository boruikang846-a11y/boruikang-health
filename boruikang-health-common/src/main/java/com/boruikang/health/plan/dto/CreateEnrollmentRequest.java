package com.boruikang.health.plan.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
/** Signs a patient onto a package. Payment is recorded as an order number only; no money moves through this system. */
public record CreateEnrollmentRequest(@NotNull @Positive Long patientId,@NotNull @Positive Long packageId,@Size(max=60) String orderNo,
    @NotNull @PastOrPresent LocalDateTime signedAt,@NotNull @PastOrPresent LocalDateTime consentAt,@NotBlank @Size(max=400) String consentEvidence,
    @Size(max=1000) String summary,Boolean activateNow,@NotBlank @Pattern(regexp="[a-zA-Z0-9-]{1,80}") String requestKey) {}
