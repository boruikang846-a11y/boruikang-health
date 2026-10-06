package com.boruikang.health.patient.dto;
import jakarta.validation.constraints.*;
public record EnrollRequest(@Size(max=64) String token,@NotBlank @Size(max=80) String name,
    @NotBlank @Pattern(regexp="MALE|FEMALE|UNKNOWN") String gender,@NotNull @Min(0) @Max(130) Integer age,
    @NotBlank @Pattern(regexp="[+0-9 -]{6,24}") String phone,@NotNull @AssertTrue Boolean consent) {}
