package com.bgssai.health.patient.dto;
import jakarta.validation.constraints.*;
/** Assignment metadata for a server-parsed file. */
public record ImportPatientFileRequest(
 @NotBlank @Pattern(regexp="[a-zA-Z0-9-]{1,60}") String importBatch,
 @NotNull @Positive Long doctorId, @NotNull @Positive Long ownerId,
 @Pattern(regexp="OUTPATIENT|INPATIENT|DISCHARGED|UNKNOWN") String patientType,
 @Pattern(regexp="ECG_NETWORK|EXAM|COMMUNITY_SCREENING|PRIMARY_REFERRAL|OUTPATIENT|INPATIENT|DISCHARGE|CAMPAIGN|MANUAL") String sourceScene,
 @Positive Long orgId, Boolean outreach) {}
