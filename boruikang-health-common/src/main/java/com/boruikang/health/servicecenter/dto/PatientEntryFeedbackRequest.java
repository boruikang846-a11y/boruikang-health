package com.boruikang.health.servicecenter.dto;
import jakarta.validation.constraints.*;
public record PatientEntryFeedbackRequest(@NotBlank @Pattern(regexp="[A-Za-z0-9_-]{43}") String token,
 @NotNull @Positive Long journeyId,@NotBlank @Pattern(regexp="[a-zA-Z0-9-]{1,80}") String requestId,
 @NotBlank @Pattern(regexp="SERVICE|CLINICAL|COMPLAINT") String kind,@NotBlank @Size(max=2000) String content) {}
