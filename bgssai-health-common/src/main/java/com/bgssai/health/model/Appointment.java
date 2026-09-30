package com.bgssai.health.model;
import java.time.LocalDateTime;
public class Appointment extends BaseRow {
    public Long hospitalId;
    public Long patientId;
    public Long taskId;
    public Long invitationId;
    public Long referralId;
    public String appointmentType;
    public String channel;
    public LocalDateTime appointmentAt;
    public String department;
    public Long clinicianId;
    public String status;
    public LocalDateTime reminderSentAt;
    public LocalDateTime arrivedAt;
    public Boolean effective;
    public String noShowReason;
    public String outcome;
    public String outcomeNote;
    public String evidence;
    public Long actorId;
    public String requestKey;
    public Integer version;
}
