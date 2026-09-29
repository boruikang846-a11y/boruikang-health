package com.bgssai.health.patient.dto;
import java.util.List;
public record TimelineResponse(Long patientId,List<TimelineEvent> events,boolean truncated) {}
