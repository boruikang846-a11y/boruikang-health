package com.bgssai.health.plan.dto;
import jakarta.validation.constraints.*;
public record PlanQueryRequest(@Min(0) Integer page,@Min(1) Integer size,@Size(max=80) String keyword,@Pattern(regexp="DRAFT|ACTIVE|RETIRED") String status,@Size(max=120) String disease) {}
