package com.bgssai.health.medication.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
/** Medication ledger entry. Records what the hospital prescribed or the patient reports; it never advises dosage. */
public record SaveMedicationRequest(@Positive Long id,@Min(0) Integer version,@NotNull @Positive Long patientId,@NotBlank @Size(max=120) String drugName,@Size(max=80) String dosage,@Size(max=80) String frequency,
    LocalDate startDate,LocalDate endDate,@Pattern(regexp="ACTIVE|STOPPED") String status,@NotBlank @Pattern(regexp="HOSPITAL_RECORD|PATIENT_REPORT|STAFF") String source,
    @Pattern(regexp="GOOD|PARTIAL|POOR|UNKNOWN") String adherence,@Size(max=1000) String note) {}
