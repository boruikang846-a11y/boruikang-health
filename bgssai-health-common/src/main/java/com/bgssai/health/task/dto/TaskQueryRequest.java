package com.bgssai.health.task.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
public record TaskQueryRequest(@Min(0) Integer page,@Min(1) Integer size,@Positive Long patientId,
    @Pattern(regexp="FOLLOWUP|CONSULTATION|ALERT|REVISIT|OUTREACH") String taskType,@Size(max=24) String status,
    @Pattern(regexp="P0|P1|P2|P3") String priority,Boolean overdue,@Positive Long assigneeId,Boolean contactPending,Boolean handoverPending,
    LocalDate dueFrom,LocalDate dueTo,Boolean revisitPending,Boolean slaOverdue,@Pattern(regexp="STAFF|PATIENT_REPORT|OBSERVATION|ECG|LOST_CONTACT|RULE") String alertSource,@Positive Long enrollmentId) {
    public TaskQueryRequest(Integer page,Integer size,Long patientId,String taskType,String status,String priority,Boolean overdue) {
        this(page,size,patientId,taskType,status,priority,overdue,null,null,null,null,null,null,null,null,null);
    }
    public TaskQueryRequest(Integer page,Integer size,Long patientId,String taskType,String status,String priority,Boolean overdue,Long assigneeId,Boolean contactPending,Boolean handoverPending,LocalDate dueFrom,LocalDate dueTo,Boolean revisitPending) {
        this(page,size,patientId,taskType,status,priority,overdue,assigneeId,contactPending,handoverPending,dueFrom,dueTo,revisitPending,null,null,null);
    }
}
