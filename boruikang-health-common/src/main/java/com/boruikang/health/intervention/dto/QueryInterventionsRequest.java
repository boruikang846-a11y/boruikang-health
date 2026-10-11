package com.boruikang.health.intervention.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
public record QueryInterventionsRequest(@Min(0) Integer page,@Min(1) @Max(100) Integer size,@Positive Long patientId,@NotBlank @Pattern(regexp="OUTPATIENT|INPATIENT|EXAM|CONSULTATION|REFERRAL") String center,@Pattern(regexp="PRE|IN|POST") String phase,@Pattern(regexp="TODO|ACTIVE|REVIEW|READY|RESOLVED|CLOSED") String status,@Size(max=160) String keyword,Boolean overdue) {}
