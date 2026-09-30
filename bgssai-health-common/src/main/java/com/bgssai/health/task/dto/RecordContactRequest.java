package com.bgssai.health.task.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
public record RecordContactRequest(@NotNull @Positive Long id,@NotNull @Min(0) Integer version,
    @NotBlank @Size(max=1000) String evidence,@NotNull @PastOrPresent LocalDateTime contactAt,
    @NotBlank @Pattern(regexp="PHONE|IN_PERSON|MANUAL_OTHER") String method,
    @NotNull @AssertTrue Boolean identityVerified,
    @NotBlank @Pattern(regexp="PATIENT|AUTHORIZED_CONTACT") String recipientRole,
    @NotNull Boolean reportReviewed,@NotBlank @Size(max=2000) String medicationFeedback,
    @NotBlank @Size(max=2000) String patientQuestions,@Min(1) @Max(5) Integer satisfaction,@Size(max=1000) String complaint) {
    public RecordContactRequest(Long id,Integer version,String evidence,LocalDateTime contactAt,String method,Boolean identityVerified,String recipientRole,Boolean reportReviewed,String medicationFeedback,String patientQuestions) { this(id,version,evidence,contactAt,method,identityVerified,recipientRole,reportReviewed,medicationFeedback,patientQuestions,null,null); }
}
