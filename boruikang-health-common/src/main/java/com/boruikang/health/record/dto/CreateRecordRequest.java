package com.boruikang.health.record.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
public record CreateRecordRequest(@NotNull @Positive Long patientId,@NotBlank @Pattern(regexp="OUTPATIENT|DISCHARGE|EXAM") String recordType,
    @NotNull @PastOrPresent LocalDateTime occurredAt,@NotBlank @Size(max=10000) String content,
    @Min(1) @Max(730) Integer medicationCycleDays,LocalDate nextVisitDate) {}
