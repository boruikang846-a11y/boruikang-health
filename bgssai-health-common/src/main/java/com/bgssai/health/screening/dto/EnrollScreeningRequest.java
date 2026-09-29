package com.bgssai.health.screening.dto;
import jakarta.validation.constraints.*;
/** Turns a judged screening record into a managed patient (or links an existing patient) and opens the first-contact task. */
public record EnrollScreeningRequest(@NotNull @Positive Long id,@NotNull @Min(0) Integer version,@Positive Long existingPatientId,
    @Size(max=80) String department,@Size(max=120) String disease,@Positive Long doctorId,@Positive Long ownerId,
    @Pattern(regexp="OUTPATIENT|INPATIENT|DISCHARGED|UNKNOWN") String patientType,
    @Pattern(regexp="ECG_NETWORK|EXAM|COMMUNITY_SCREENING|PRIMARY_REFERRAL|OUTPATIENT|INPATIENT|DISCHARGE|CAMPAIGN|MANUAL") String sourceScene,
    Boolean outreach,@Size(max=2000) String note) {}
