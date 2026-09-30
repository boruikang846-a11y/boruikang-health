package com.bgssai.health.template.dto;
import java.time.LocalDateTime;
public record MessageLogResponse(Long id,Long patientId,Long taskId,String channel,String templateCode,String content,LocalDateTime sentAt,Long actorId,String evidence) {}
