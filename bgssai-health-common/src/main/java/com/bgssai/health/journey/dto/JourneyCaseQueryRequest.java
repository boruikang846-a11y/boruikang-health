package com.bgssai.health.journey.dto;
import jakarta.validation.constraints.*;
public record JourneyCaseQueryRequest(@Min(0) Integer page,@Min(1) Integer size,@Positive Long patientId,@Pattern(regexp="SERVICE|CLINICAL|COMPLAINT") String kind,@Pattern(regexp="OPEN|ACCEPTED|RESOLVED|CLOSED") String status,Boolean overdue) {}
