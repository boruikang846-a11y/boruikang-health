package com.boruikang.health.referral.dto;
import java.time.LocalDateTime;
public record ReferralResponse(Long id,Long patientId,String patientName,String direction,String referralType,Long fromOrgId,Long toOrgId,String reason,String riskLevel,LocalDateTime initiatedAt,LocalDateTime slaDueAt,
    String status,LocalDateTime acceptedAt,LocalDateTime arrivedAt,String feedbackDepartment,Long feedbackClinicianId,String feedbackDiagnosis,String feedbackDisposition,LocalDateTime feedbackAt,String evidence,Long actorId,Integer version,boolean overdue) {}
