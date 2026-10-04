package com.boruikang.health.patient.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
public record ConsentRequest(@NotNull @Positive Long id,@NotNull @Min(0) Integer version,@NotNull @PastOrPresent LocalDateTime consentAt,
    @NotBlank @Size(max=20) String consentVersion,@NotBlank @Size(max=400) String consentEvidence) {}
