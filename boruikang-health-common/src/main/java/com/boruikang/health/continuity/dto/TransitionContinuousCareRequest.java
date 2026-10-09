package com.boruikang.health.continuity.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
public record TransitionContinuousCareRequest(@NotNull Long id, @NotNull Integer version, @NotNull @Pattern(regexp="PAUSE|RESUME|CLOSE") String action, @NotBlank @Size(max=2000) String evidence) {}
