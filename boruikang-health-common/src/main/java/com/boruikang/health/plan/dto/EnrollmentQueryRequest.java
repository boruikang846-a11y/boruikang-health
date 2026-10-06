package com.boruikang.health.plan.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
public record EnrollmentQueryRequest(@Min(0) Integer page,@Min(1) Integer size,@Positive Long patientId,@Positive Long packageId,
    @Pattern(regexp="PENDING_ACTIVATION|ACTIVE|EXPIRED|CLOSED|UPGRADED") String status,LocalDate endFrom,LocalDate endTo,Boolean expiringSoon) {}
