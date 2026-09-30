package com.bgssai.health.record.dto;
import jakarta.validation.constraints.*;
public record RecordQueryRequest(@Min(0) Integer page,@Min(1) Integer size,@NotNull @Positive Long patientId,
    @Pattern(regexp="OUTPATIENT|DISCHARGE|EXAM|OBSERVATION") String recordType) {}
