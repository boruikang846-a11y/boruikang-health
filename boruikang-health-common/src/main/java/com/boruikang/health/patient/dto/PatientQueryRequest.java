package com.boruikang.health.patient.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
public record PatientQueryRequest(@Min(0) Integer page,@Min(1) Integer size,@Size(max=80) String keyword,
    @Size(max=16) String riskLevel,@Size(max=80) String department,@Size(max=20) String lifecycle,@Size(max=24) String sourceScene,
    @Positive Long orgId,@Positive Long ownerId,@Positive Long doctorId,@Size(max=30) String tag,
    Boolean overdue,Boolean openAlert,Boolean revisitPending,LocalDate createdFrom,LocalDate createdTo,LocalDate contactFrom,LocalDate contactTo) {
    public PatientQueryRequest(Integer page,Integer size,String keyword,String riskLevel,String department) {
        this(page,size,keyword,riskLevel,department,null,null,null,null,null,null,null,null,null,null,null,null,null);
    }
}
