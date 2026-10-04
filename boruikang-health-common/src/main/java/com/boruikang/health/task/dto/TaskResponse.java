package com.boruikang.health.task.dto;
import java.time.LocalDateTime;
public record TaskResponse(Long id,Long patientId,String patientName,String taskType,String title,String priority,String status,
    Long assigneeId,Long doctorId,LocalDateTime dueAt,Long recordId,Long knowledgeId,String draftText,String draftOrigin,String approvedText,
    String reviewNote,Long reviewerId,LocalDateTime reviewedAt,LocalDateTime completedAt,String outcome,String evidence,Integer version,boolean overdue,String followupStage,LocalDateTime nextContactAt,
    String contactResult,Boolean identityVerified,String handoverStatus,String doctorFeedback,LocalDateTime acknowledgedAt,
    String alertSource,LocalDateTime slaDueAt,LocalDateTime ackAt,String disposition,Long appointmentId,Long enrollmentId,Integer planNodeSeq,LocalDateTime reminderSentAt,boolean slaOverdue) {}
