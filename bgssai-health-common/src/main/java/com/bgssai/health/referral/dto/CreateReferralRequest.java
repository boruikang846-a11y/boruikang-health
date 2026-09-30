package com.bgssai.health.referral.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
public record CreateReferralRequest(@NotNull @Positive Long patientId,@NotBlank @Pattern(regexp="OUTBOUND|INBOUND") String direction,@NotBlank @Pattern(regexp="UPWARD|DOWNWARD|LATERAL") String referralType,
    @Positive Long fromOrgId,@Positive Long toOrgId,@NotBlank @Size(max=1000) String reason,@Pattern(regexp="UNKNOWN|LOW|MEDIUM|HIGH|CRITICAL") String riskLevel,
    @PastOrPresent LocalDateTime initiatedAt,@NotBlank @Size(max=1000) String evidence,@NotBlank @Pattern(regexp="[a-zA-Z0-9-]{1,80}") String requestKey) {}
