package com.boruikang.health.intervention.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
public record ActInterventionRequest(@NotNull @Positive Long id,@NotNull @Min(0) Integer version,@NotBlank @Pattern(regexp="START|SUBMIT|ACKNOWLEDGE|APPROVE|REJECT|COMPLETE|CLOSE|REOPEN|NOTE|ARRIVAL|RATE") String action,@NotBlank @Size(max=2000) String note,LocalDateTime occurredAt,@Min(1) @Max(5) Integer score) {}
