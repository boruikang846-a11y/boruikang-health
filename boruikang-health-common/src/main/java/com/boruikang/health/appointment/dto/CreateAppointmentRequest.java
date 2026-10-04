package com.boruikang.health.appointment.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
public record CreateAppointmentRequest(@NotNull @Positive Long patientId,@Positive Long taskId,@Positive Long invitationId,@Positive Long referralId,
    @NotBlank @Pattern(regexp="OUTPATIENT|EXAM|REVISIT|INPATIENT|SPECIALIST_CLINIC") String appointmentType,
    @NotBlank @Pattern(regexp="GREEN_CHANNEL|STAFF_BOOKED|SELF_BOOKED|ONLINE") String channel,@NotNull LocalDateTime appointmentAt,
    @NotBlank @Size(max=80) String department,@Positive Long clinicianId,@NotBlank @Size(max=1000) String evidence,@NotBlank @Pattern(regexp="[a-zA-Z0-9-]{1,80}") String requestKey) {}
