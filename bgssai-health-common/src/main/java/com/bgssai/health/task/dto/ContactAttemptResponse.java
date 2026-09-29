package com.bgssai.health.task.dto;
import java.time.LocalDateTime;
public record ContactAttemptResponse(Long id,Long actorId,LocalDateTime contactAt,String method,String result,
    Boolean identityVerified,Boolean reportReviewed,String recipientRole,String reason,LocalDateTime nextContactAt,
    String nextPlan,String medicationFeedback,String patientQuestions,String evidence,Integer satisfaction,String complaint) {}
