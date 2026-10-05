package com.boruikang.health.plan.dto;
import jakarta.validation.constraints.*;
public record SavePackageRequest(@Positive Long id,@Min(0) Integer version,@NotBlank @Pattern(regexp="[A-Z0-9_-]{2,40}") String code,@NotBlank @Size(max=120) String name,
    @NotBlank @Size(max=120) String disease,@NotBlank @Pattern(regexp="BASIC|STANDARD|PREMIUM") String tier,@NotBlank @Pattern(regexp="POST_VISIT|POST_DISCHARGE|POST_SURGERY|SCREENING|LONG_TERM") String scene,
    @NotNull @Min(1) @Max(1095) Integer periodDays,@NotNull @Min(0) @Max(100000000) Integer priceCents,@Min(0) @Max(365) Integer followupCount,@Min(0) @Max(365) Integer assessmentCount,@Min(0) @Max(365) Integer reviewCount,
    @Size(max=400) String deviceNote,@Size(max=400) String privilegeNote,@Size(max=120) String serviceHours,@Size(max=4000) String content,@Size(max=2000) String redLines,@Positive Long planId) {}
