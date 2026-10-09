package com.boruikang.health.servicecenter.dto;
import java.time.LocalDateTime;
public record ServiceFeedbackResponse(Long id,Long journeyId,Long caseId,Integer caseVersion,String kind,String content,String status,
 String patientReply,LocalDateTime repliedAt,LocalDateTime createdAt) {}
