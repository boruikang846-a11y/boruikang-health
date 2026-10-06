package com.boruikang.health.hospital.dto;
import jakarta.validation.constraints.*;
public record HospitalSyncRequest(@NotBlank @Pattern(regexp="NORMAL|EMPTY|UNAVAILABLE") String scenario,
    @NotNull @Positive Long doctorId,@NotNull @Positive Long ownerId) {}
