package com.boruikang.health.continuity.dto;
import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.util.List;
public record PatientServiceSummaryResponse(Long patientId,String patientName,String department,String ownerName,String doctorName,
 boolean authorized,Report latestReport,List<Journey> journeys,List<Task> tasks,long openTaskCount,List<Issue> issues,long openIssueCount,
 List<Appointment> appointments,List<Observation> observations,List<ContinuousCareResponse> plans) {
 public record Report(Long id,String type,LocalDateTime occurredAt,String source,boolean reviewed,String doctorOpinion) {}
 public record Journey(Long id,String kind,String status,LocalDateTime eventAt,Integer stage) {}
 public record Task(Long id,String type,String title,String status,String priority,Long ownerId,LocalDateTime dueAt) {}
 public record Issue(Long id,Long journeyId,String kind,String status,String summary,LocalDateTime dueAt) {}
 public record Appointment(Long id,String type,String status,LocalDateTime appointmentAt,LocalDateTime arrivedAt,String evidence) {}
 public record Observation(Long id,LocalDateTime occurredAt,BigDecimal systolic,BigDecimal diastolic,BigDecimal heartRate,BigDecimal weight,BigDecimal glucose,String source) {}
}
