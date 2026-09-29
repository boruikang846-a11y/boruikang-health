package com.bgssai.health.referral.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
public record TransitionReferralRequest(@NotNull @Positive Long id,@NotNull @Min(0) Integer version,@NotBlank @Pattern(regexp="ACCEPT|ARRIVE|FEEDBACK|CLOSE|REJECT") String action,
    @PastOrPresent LocalDateTime at,@Size(max=80) String feedbackDepartment,@Positive Long feedbackClinicianId,@Size(max=400) String feedbackDiagnosis,@Size(max=1000) String feedbackDisposition,
    @Size(max=1000) String reason,@Size(max=1000) String evidence) {}
