package com.boruikang.health.record.dto;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
/** Staff-entered measurement on behalf of a patient (phone report, device sheet, home visit). */
public record StaffObservationRequest(@NotNull @Positive Long patientId,@NotNull @PastOrPresent LocalDateTime occurredAt,
    @DecimalMin("30") @DecimalMax("300") @Digits(integer=3,fraction=2) BigDecimal systolic,
    @DecimalMin("20") @DecimalMax("200") @Digits(integer=3,fraction=2) BigDecimal diastolic,
    @DecimalMin("20") @DecimalMax("300") @Digits(integer=3,fraction=2) BigDecimal heartRate,
    @DecimalMin("1") @DecimalMax("500") @Digits(integer=3,fraction=2) BigDecimal weight,
    @DecimalMin("0.1") @DecimalMax("60") @Digits(integer=2,fraction=2) BigDecimal glucose,
    @Size(max=2000) String content,Boolean needsContact,@NotBlank @Pattern(regexp="PHONE|DEVICE|HOME_VISIT|HOSPITAL") String source) {}
