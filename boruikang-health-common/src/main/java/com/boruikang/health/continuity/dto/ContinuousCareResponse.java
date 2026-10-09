package com.boruikang.health.continuity.dto;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
public record ContinuousCareResponse(Long id,Long patientId,String diseaseCode,String status,String approvalStatus,
 String baseline,String goals,String patientInstructions,LocalDate nextReviewDate,Integer revision,Integer version,
 Long reviewerId,LocalDateTime reviewedAt,List<Long> journeyIds,List<Review> history,long historyCount) {
 public record Review(Long id,Integer revision,String kind,String summary,String evidence,String patientMessage,
 String assessment,Long journeyId,Long actorId,LocalDate nextReviewDate,LocalDateTime createdAt) {}
}
