package com.boruikang.health.appointment.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
public record AppointmentQueryRequest(@Min(0) Integer page,@Min(1) Integer size,@Positive Long patientId,
    @Pattern(regexp="BOOKED|REMINDED|ARRIVED|COMPLETED|NO_SHOW|CANCELLED") String status,
    @Pattern(regexp="OUTPATIENT|EXAM|REVISIT|INPATIENT|SPECIALIST_CLINIC") String appointmentType,
    @Pattern(regexp="GREEN_CHANNEL|STAFF_BOOKED|SELF_BOOKED|ONLINE") String channel,LocalDate from,LocalDate to,@Positive Long clinicianId,@Size(max=80) String department,Boolean open) {}
