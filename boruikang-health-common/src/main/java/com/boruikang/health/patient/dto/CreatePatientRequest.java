package com.boruikang.health.patient.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.List;
public record CreatePatientRequest(@NotBlank @Size(max=80) String name,@NotBlank @Pattern(regexp="MALE|FEMALE|UNKNOWN") String gender,
    @NotNull @Min(0) @Max(130) Integer age,@NotBlank @Pattern(regexp="[+0-9 -]{6,24}") String phone,
    @NotBlank @Size(max=80) String department,@NotBlank @Size(max=120) String disease,
    @Positive Long doctorId,@Positive Long ownerId,@Size(max=2000) String note,
    @Pattern(regexp="[0-9Xx]{15,18}") String idCard,LocalDate birthDate,@Size(max=200) String address,
    @Size(max=80) String emergencyContact,@Size(max=24) String emergencyPhone,@Size(max=60) String inpatientNo,@Size(max=20) String bedNo,
    @Pattern(regexp="OUTPATIENT|INPATIENT|DISCHARGED|UNKNOWN") String patientType,
    @Pattern(regexp="ECG_NETWORK|EXAM|COMMUNITY_SCREENING|PRIMARY_REFERRAL|OUTPATIENT|INPATIENT|DISCHARGE|CAMPAIGN|MANUAL") String sourceScene,
    @Positive Long orgId,@Positive Long referrerId,@Positive Long channelId,@Size(max=10) List<@Size(max=30) String> tags,
    @Pattern(regexp="UNKNOWN|LOW|MEDIUM|HIGH|CRITICAL") String riskLevel,@Size(max=400) String riskEvidence,Boolean outreach) {
    public CreatePatientRequest(String name,String gender,Integer age,String phone,String department,String disease,Long doctorId,Long ownerId,String note) {
        this(name,gender,age,phone,department,disease,doctorId,ownerId,note,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null);
    }
}
