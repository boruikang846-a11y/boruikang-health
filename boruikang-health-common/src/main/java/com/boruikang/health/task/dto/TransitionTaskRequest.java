package com.boruikang.health.task.dto;
import jakarta.validation.constraints.*;
public record TransitionTaskRequest(@NotNull @Positive Long id,@NotNull @Min(0) Integer version,
    @NotBlank @Pattern(regexp="COMPLETE|ESCALATE|BOOK|ARRIVE|NO_SHOW|CANCEL") String action,
    @Size(max=2000) String outcome,@Size(max=1000) String evidence,@Pattern(regexp="OUTPATIENT|EMERGENCY|INPATIENT|OBSERVE|FALSE_ALARM|OTHER") String disposition) {
    public TransitionTaskRequest(Long id,Integer version,String action,String outcome,String evidence) { this(id,version,action,outcome,evidence,null); }
}
