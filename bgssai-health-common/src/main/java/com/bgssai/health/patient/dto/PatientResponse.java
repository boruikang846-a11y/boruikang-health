package com.bgssai.health.patient.dto;
import java.time.LocalDateTime;
public record PatientResponse(Long id,String name,String gender,Integer age,String phone,String department,String disease,
    String riskLevel,String lifecycle,Long doctorId,Long ownerId,Long channelId,Long servicePackageId,LocalDateTime consentAt,
    String note,Integer version,LocalDateTime gmtCreate) {}
