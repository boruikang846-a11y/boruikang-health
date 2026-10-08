package com.boruikang.health.servicecenter.dto;
import java.time.LocalDateTime;
public record ServiceEntryResponse(Long id,Long contactId,String nickname,String status,String patientName,String phone,String relation,
 String entryPhase,Long patientId,String identityEvidence,LocalDateTime consentAt,LocalDateTime expiresAt,Integer version) {}
