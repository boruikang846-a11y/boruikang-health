package com.boruikang.health.record.dto;
import jakarta.validation.constraints.*;
/** Doctor's report worklist; viewed=false lists reports still waiting for the doctor. */
public record ReportQueryRequest(@Min(0) Integer page,@Min(1) Integer size,Boolean viewed,
    @Pattern(regexp="OUTPATIENT|DISCHARGE|EXAM") String recordType,@Positive Long patientId) {}
