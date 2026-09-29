package com.bgssai.health.medication.dto;
import java.time.LocalDate;
public record MedicationResponse(Long id,Long patientId,String drugName,String dosage,String frequency,LocalDate startDate,LocalDate endDate,String status,String source,String adherence,String note,Integer version) {}
