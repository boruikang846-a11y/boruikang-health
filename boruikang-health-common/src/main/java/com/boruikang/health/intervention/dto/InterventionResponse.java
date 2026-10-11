package com.boruikang.health.intervention.dto;
import java.time.LocalDateTime;
import java.util.List;
public record InterventionResponse(Long id,Long patientId,String patientName,Long ownerId,Long doctorId,String center,String phase,String category,String title,String content,Boolean clinical,Long recordId,String recordContent,LocalDateTime dueAt,String status,String approvedContent,Long reviewerId,String result,LocalDateTime firstResponseAt,LocalDateTime arrivedAt,String arrivalEvidence,Integer score,String feedback,Integer version,LocalDateTime createdAt,Long acknowledgedBy,List<Log> logs) { public record Log(Long id,Long actorId,String action,String note,String beforeJson,String afterJson,LocalDateTime at) {} }
