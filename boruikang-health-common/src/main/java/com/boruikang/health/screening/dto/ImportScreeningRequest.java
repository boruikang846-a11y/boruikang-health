package com.boruikang.health.screening.dto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
import java.util.List;
/** Pasted-table or file import: the browser normalizes rows; the server validates and de-duplicates by external id. */
public record ImportScreeningRequest(@NotBlank @Pattern(regexp="ECG_NETWORK|EXAM|HEALTH_SCREENING|STROKE_SCREENING|OUTPATIENT|INPATIENT|CAMPAIGN") String sourceType,
    @NotBlank @Pattern(regexp="[a-zA-Z0-9-]{1,60}") String importBatch,@Positive Long orgId,@Positive Long campaignId,@Positive Long ownerId,
    @NotEmpty @Size(max=500) List<@Valid Row> rows) {
    public record Row(@NotBlank @Size(max=80) String name,@Pattern(regexp="MALE|FEMALE|UNKNOWN") String gender,@Min(0) @Max(130) Integer age,
        @NotBlank @Pattern(regexp="[+0-9 -]{6,24}") String phone,@Size(max=6) String idCardTail,LocalDateTime screenedAt,
        @NotBlank @Size(max=1000) String finding,@Size(max=80) String category,@Size(max=80) String externalId) {}
}
