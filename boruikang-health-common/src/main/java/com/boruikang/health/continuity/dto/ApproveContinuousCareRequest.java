package com.boruikang.health.continuity.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
public record ApproveContinuousCareRequest(@NotNull Long id, @NotNull Integer version, @NotNull Boolean approve, @NotBlank @Size(max=2000) String evidence) {}
