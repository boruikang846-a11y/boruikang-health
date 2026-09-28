package com.bgssai.health.hospital.dto;
import jakarta.validation.constraints.*;
public record HospitalQueryRequest(@NotBlank @Pattern(regexp="NORMAL|EMPTY|UNAVAILABLE") String scenario) {}
