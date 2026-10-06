package com.boruikang.health.patient.dto;
/** Counts cover the caller's patient scope, independently of list filters and pagination. */
public record PatientSummaryResponse(long patientCount,long unknownRiskCount,long highRiskCount,long fileImportCount) {}
