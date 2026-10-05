package com.boruikang.health.account.dto;
import jakarta.validation.constraints.*;
public record CreateStaffAccountRequest(@NotBlank @Pattern(regexp="[a-zA-Z0-9_.-]{3,40}") String username,@NotBlank @Size(max=80) String realName,
    @NotBlank @Pattern(regexp="DOCTOR|NURSE|OPERATOR") String roleCode,@Size(max=80) String department,@NotBlank @Size(min=8,max=64) String password) {}
