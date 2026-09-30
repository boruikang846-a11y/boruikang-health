package com.bgssai.health.task.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
public record RecordAttemptRequest(@NotNull @Positive Long id,@NotNull @Min(0) Integer version,
    @NotNull @PastOrPresent LocalDateTime contactAt,@NotBlank @Pattern(regexp="PHONE|IN_PERSON|MANUAL_OTHER") String method,
    @NotBlank @Pattern(regexp="NO_ANSWER|BUSY|WRONG_NUMBER|REFUSED|IDENTITY_UNVERIFIED|FAMILY_ANSWERED|NOT_COOPERATIVE|DECEASED|OTHER") String result,
    @NotBlank @Size(max=1000) String reason,@NotNull LocalDateTime nextContactAt,
    @NotBlank @Size(max=1000) String nextPlan,@NotBlank @Size(max=1000) String evidence) {}
