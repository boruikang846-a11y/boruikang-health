package com.bgssai.health.knowledge.dto;
import java.time.LocalDateTime;
public record KnowledgeResponse(Long id,String kind,String department,String title,String content,String source,Integer version,
    String status,Long reviewerId,LocalDateTime reviewedAt,Integer serviceDays,Integer followupCount) {}
