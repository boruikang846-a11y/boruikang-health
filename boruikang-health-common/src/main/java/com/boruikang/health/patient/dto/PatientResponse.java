package com.boruikang.health.patient.dto;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
public record PatientResponse(Long id,String name,String gender,Integer age,String phone,String department,String disease,
    String riskLevel,String lifecycle,Long doctorId,Long ownerId,Long channelId,Long servicePackageId,LocalDateTime consentAt,
    String note,Integer version,LocalDateTime gmtCreate,String sourceSystem,String hospitalPatientId,
    String idCard,LocalDate birthDate,String address,String emergencyContact,String emergencyPhone,String inpatientNo,String bedNo,
    String patientType,String sourceScene,Long orgId,Long referrerId,LocalDateTime lastContactAt,LocalDateTime lostSince,
    String consentVersion,String consentEvidence,List<String> tags) {}
