package com.boruikang.health.servicecenter.dto;
import java.time.LocalDateTime;
import java.util.List;
public record PatientPortalResponse(String status,String patientName,String consentVersion,boolean mock,
 List<Journey> journeys,List<Feedback> feedback) {
 public record Journey(Long id,String kind,String status,String phase,String step,LocalDateTime eventAt) {}
 public record Feedback(Long id,Long journeyId,String kind,String content,String status,LocalDateTime createdAt) {}
}
