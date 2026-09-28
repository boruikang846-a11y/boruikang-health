package com.bgssai.health.task.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
public record TaskQueryRequest(@Min(0) Integer page,@Min(1) Integer size,@Positive Long patientId,
    @Pattern(regexp="FOLLOWUP|CONSULTATION|ALERT|REVISIT") String taskType,@Size(max=24) String status,
    @Pattern(regexp="P0|P1|P2|P3") String priority,Boolean overdue,@Positive Long assigneeId,Boolean contactPending,Boolean handoverPending,
    LocalDate dueFrom,LocalDate dueTo,Boolean revisitPending) {
    public TaskQueryRequest(Integer page,Integer size,Long patientId,String taskType,String status,String priority,Boolean overdue) {
        this(page,size,patientId,taskType,status,priority,overdue,null,null,null,null,null,null);
    }
}
