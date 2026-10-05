package com.boruikang.health.screening.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
public record CreateScreeningRequest(@NotBlank @Pattern(regexp="ECG_NETWORK|EXAM|HEALTH_SCREENING|STROKE_SCREENING|OUTPATIENT|INPATIENT|CAMPAIGN") String sourceType,
    @NotBlank @Size(max=80) String name,@NotBlank @Pattern(regexp="MALE|FEMALE|UNKNOWN") String gender,@Min(0) @Max(130) Integer age,
    @NotBlank @Pattern(regexp="[+0-9 -]{6,24}") String phone,@Size(max=6) String idCardTail,@NotNull @PastOrPresent LocalDateTime screenedAt,
    @NotBlank @Size(max=1000) String finding,@Size(max=80) String category,@Positive Long orgId,@Positive Long campaignId,@Positive Long ownerId,
    @Size(max=80) String externalId,@Size(max=1000) String note) {}
