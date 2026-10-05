package com.bgssai.health.journey.dto;
import java.time.LocalDateTime;
public record JourneyCaseResponse(Long id,Long journeyId,Long patientId,String patientName,String kind,String status,String summary,LocalDateTime dueAt,Boolean overdue) {}
