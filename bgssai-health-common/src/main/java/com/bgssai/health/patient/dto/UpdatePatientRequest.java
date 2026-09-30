package com.bgssai.health.patient.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.List;
public record UpdatePatientRequest(@NotNull @Positive Long id,@NotNull @Min(0) Integer version,
    @Positive Long doctorId,@Positive Long ownerId,
    @Pattern(regexp="ENROLLED|CONTACTED|BOOKED|ARRIVED|MANAGING|REVISIT_DUE|PAUSED|TRANSFERRED|LOST|CLOSED") String lifecycle,
    @Pattern(regexp="UNKNOWN|LOW|MEDIUM|HIGH|CRITICAL") String riskLevel,@Size(max=400) String riskEvidence,@Size(max=2000) String note,@Positive Long servicePackageId,
    @Size(max=80) String name,@Pattern(regexp="MALE|FEMALE|UNKNOWN") String gender,@Min(0) @Max(130) Integer age,@Pattern(regexp="[+0-9 -]{6,24}") String phone,
    @Size(max=80) String department,@Size(max=120) String disease,
    @Pattern(regexp="[0-9Xx]{15,18}") String idCard,LocalDate birthDate,@Size(max=200) String address,
    @Size(max=80) String emergencyContact,@Size(max=24) String emergencyPhone,@Size(max=60) String inpatientNo,@Size(max=20) String bedNo,
    @Pattern(regexp="OUTPATIENT|INPATIENT|DISCHARGED|UNKNOWN") String patientType,
    @Pattern(regexp="ECG_NETWORK|EXAM|COMMUNITY_SCREENING|PRIMARY_REFERRAL|OUTPATIENT|INPATIENT|DISCHARGE|CAMPAIGN|MANUAL") String sourceScene,
    @Positive Long orgId,@Positive Long referrerId,@Size(max=10) List<@Size(max=30) String> tags,@Size(max=400) String lifecycleReason) {
    public UpdatePatientRequest(Long id,Integer version,Long doctorId,Long ownerId,String lifecycle,String riskLevel,String riskEvidence,String note,Long servicePackageId) {
        this(id,version,doctorId,ownerId,lifecycle,riskLevel,riskEvidence,note,servicePackageId,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null);
    }
}
