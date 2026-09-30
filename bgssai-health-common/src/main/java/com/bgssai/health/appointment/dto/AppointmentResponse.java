package com.bgssai.health.appointment.dto;
import java.time.LocalDateTime;
public record AppointmentResponse(Long id,Long patientId,String patientName,Long taskId,Long invitationId,Long referralId,String appointmentType,String channel,LocalDateTime appointmentAt,
    String department,Long clinicianId,String status,LocalDateTime reminderSentAt,LocalDateTime arrivedAt,Boolean effective,String noShowReason,String outcome,String outcomeNote,
    String evidence,Long actorId,Integer version,LocalDateTime gmtCreate) {}
