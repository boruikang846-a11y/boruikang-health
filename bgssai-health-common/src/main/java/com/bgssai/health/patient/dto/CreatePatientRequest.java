package com.bgssai.health.patient.dto;
import jakarta.validation.constraints.*;
public record CreatePatientRequest(@NotBlank @Size(max=80) String name,@NotBlank @Pattern(regexp="MALE|FEMALE|UNKNOWN") String gender,
    @NotNull @Min(0) @Max(130) Integer age,@NotBlank @Pattern(regexp="[+0-9 -]{6,24}") String phone,
    @NotBlank @Size(max=80) String department,@NotBlank @Size(max=120) String disease,
    @Positive Long doctorId,@Positive Long ownerId,@Size(max=2000) String note) {}
