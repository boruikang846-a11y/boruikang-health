package com.boruikang.health.report.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
public record DeliverReportRequest(@NotNull @Positive Long id,@NotNull @Min(0) Integer version,
    @NotBlank @Size(max=1000) String evidence,@NotNull @PastOrPresent LocalDateTime deliveredAt) {}
