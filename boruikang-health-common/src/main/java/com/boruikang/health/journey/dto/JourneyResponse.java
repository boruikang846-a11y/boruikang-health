package com.boruikang.health.journey.dto;
import java.time.LocalDateTime;
import java.util.List;
import com.boruikang.health.plan.dto.PlanNodeDto;
public record JourneyResponse(Long id,Long patientId,String patientName,String kind,String entryPhase,String sourceSystem,String eventKey,LocalDateTime eventAt,String status,String currentStep,Integer stage,Integer version,Long ownerId,Long doctorId,Long currentPlanId,Long arrivalId,Long recordId,String reportSnapshot,Boolean noRevisit,String noRevisitReason,Boolean serviceAuthorizationActive,List<Step> steps,List<Result> results,List<Plan> plans,List<Task> tasks,List<Case> cases) {
 public record Step(String code,String title,String responsibility) {}
 public record Result(Long id,String action,String stepCode,String evidence,Long actorId,LocalDateTime occurredAt,LocalDateTime recordedAt,Long referenceId,String referenceType) {}
 public record Plan(Long id,Integer revision,String status,Long reportId,String reportSnapshot,String planText,List<PlanNodeDto> nodes,Long reviewerId,LocalDateTime reviewedAt,String reviewNote,Long templateId,Integer templateVersion) {}
 public record Task(Long taskId,Long planId,Integer seq,String title,String taskType,String status,LocalDateTime dueAt,String handoverStatus) {}
 public record Case(Long id,String kind,String status,String summary,LocalDateTime dueAt,Boolean overdue,String resolution,String receiptEvidence,Integer version) {}
}
