package com.bgssai.health.screening.dto;
import java.time.LocalDateTime;
public record ScreeningResponse(Long id,Long patientId,Long orgId,Long campaignId,Long ownerId,String sourceType,String name,String gender,Integer age,String phone,
    String idCardTail,LocalDateTime screenedAt,String finding,String category,String riskLevel,String riskEvidence,Long judgedBy,LocalDateTime judgedAt,
    String poolStatus,String nonHighRiskReason,String externalId,String importBatch,String note,Integer version,LocalDateTime gmtCreate) {}
