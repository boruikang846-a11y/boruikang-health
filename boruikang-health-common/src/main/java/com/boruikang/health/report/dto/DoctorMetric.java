package com.boruikang.health.report.dto;
public record DoctorMetric(Long doctorId,String doctorName,long patientCount,long dueCount,long completedCount,long openAlertCount) {}
