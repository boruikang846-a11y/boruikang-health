package com.bgssai.health.account.dto;
import jakarta.validation.constraints.*;
public record StaffAccountQueryRequest(@Min(0) Integer page,@Min(1) Integer size,
    @Pattern(regexp="MANAGER|OPERATOR|NURSE|DOCTOR") String roleCode,@Size(max=80) String keyword,Boolean enabled) {}
