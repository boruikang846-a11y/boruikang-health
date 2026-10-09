package com.boruikang.health.servicecenter.dto;
import jakarta.validation.constraints.*;
public record ReplyPatientFeedbackRequest(@NotNull Long id,@NotNull Integer caseVersion,@NotBlank @Size(max=2000) String patientReply) {}
