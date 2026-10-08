package com.boruikang.health.servicecenter.dto;
import jakarta.validation.constraints.*;
public record PatientEntryRegisterRequest(@NotBlank @Pattern(regexp="[A-Za-z0-9_-]{43}") String token,
 @NotBlank @Size(max=80) String patientName,@NotBlank @Pattern(regexp="1[3-9][0-9]{9}") String phone,
 @NotBlank @Pattern(regexp="SELF|FAMILY") String relation,@NotBlank @Pattern(regexp="FULL|AFTER_CARE") String entryPhase,
 @NotNull @AssertTrue Boolean consent) {}
