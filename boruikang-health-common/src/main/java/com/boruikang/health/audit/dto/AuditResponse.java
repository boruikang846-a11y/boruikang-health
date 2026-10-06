package com.boruikang.health.audit.dto;
import java.time.LocalDateTime;
public record AuditResponse(Long id,Long actorId,String action,Long resourceId,String beforeState,String afterState,String detail,LocalDateTime gmtCreate) {}
