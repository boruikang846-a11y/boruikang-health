package com.boruikang.health.task.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
public record CreateTaskRequest(@NotNull @Positive Long patientId,@NotBlank @Pattern(regexp="FOLLOWUP|CONSULTATION|ALERT|REVISIT|OUTREACH") String taskType,
    @NotBlank @Size(max=160) String title,@NotBlank @Pattern(regexp="P0|P1|P2|P3") String priority,
    @NotNull LocalDateTime dueAt,@Positive Long recordId,@Positive Long knowledgeId,@NotBlank @Size(max=80) String requestKey,@Pattern(regexp="STAFF|PATIENT_REPORT|OBSERVATION|ECG|LOST_CONTACT|RULE") String alertSource) {
    public CreateTaskRequest(Long patientId,String taskType,String title,String priority,LocalDateTime dueAt,Long recordId,Long knowledgeId,String requestKey) { this(patientId,taskType,title,priority,dueAt,recordId,knowledgeId,requestKey,null); }
}
