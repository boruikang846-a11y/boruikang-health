package com.boruikang.health.plan.dto;
import jakarta.validation.constraints.*;
public record PackageQueryRequest(@Min(0) Integer page,@Min(1) Integer size,@Size(max=80) String keyword,@Pattern(regexp="DRAFT|ACTIVE|RETIRED") String status,
    @Pattern(regexp="BASIC|STANDARD|PREMIUM") String tier,@Pattern(regexp="POST_VISIT|POST_DISCHARGE|POST_SURGERY|SCREENING|LONG_TERM") String scene) {}
