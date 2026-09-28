package com.bgssai.health.task.dto;
import java.time.LocalDateTime;
public record PatientPlanResponse(Long id,String taskType,String title,String status,LocalDateTime dueAt,LocalDateTime completedAt) {}
