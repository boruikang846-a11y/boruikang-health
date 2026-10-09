package com.boruikang.health.servicecenter.dto;
import jakarta.validation.constraints.*;
public record ServiceEntryQueryRequest(@Min(0) Integer page,@Min(1) @Max(100) Integer size,@Pattern(regexp="ISSUED|REGISTERED|VERIFIED|REVOKED") String status) {}
