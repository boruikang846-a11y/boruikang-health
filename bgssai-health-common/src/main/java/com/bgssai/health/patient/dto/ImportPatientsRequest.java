package com.bgssai.health.patient.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.List;

/** Browser-normalized file rows; the server validates the complete batch before writing. */
public record ImportPatientsRequest(
    @NotBlank @Pattern(regexp="[a-zA-Z0-9-]{1,60}") String importBatch,
    @NotNull @Positive Long doctorId,@NotNull @Positive Long ownerId,
    @Pattern(regexp="OUTPATIENT|INPATIENT|DISCHARGED|UNKNOWN") String patientType,
    @Pattern(regexp="ECG_NETWORK|EXAM|COMMUNITY_SCREENING|PRIMARY_REFERRAL|OUTPATIENT|INPATIENT|DISCHARGE|CAMPAIGN|MANUAL") String sourceScene,
    @Positive Long orgId,Boolean outreach,@NotEmpty @Size(max=500) List<@NotNull @Valid Row> rows) {
    public record Row(
        @NotBlank @Size(max=80) String name,@Pattern(regexp="MALE|FEMALE|UNKNOWN") String gender,
        @NotNull @Min(0) @Max(130) Integer age,@NotBlank @Pattern(regexp="[+0-9 -]{6,24}") String phone,
        @NotBlank @Size(max=80) String department,@NotBlank @Size(max=120) String disease,
        @Size(max=80) String externalId,@Pattern(regexp="[0-9Xx]{15,18}") String idCard,LocalDate birthDate,
        @Size(max=200) String address,@Size(max=80) String emergencyContact,@Size(max=24) String emergencyPhone,
        @Size(max=60) String inpatientNo,@Size(max=20) String bedNo,@Size(max=2000) String note) {}
}
