package com.boruikang.health.referral.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
public record ReferralQueryRequest(@Min(0) Integer page,@Min(1) Integer size,@Positive Long patientId,@Pattern(regexp="OUTBOUND|INBOUND") String direction,
    @Pattern(regexp="UPWARD|DOWNWARD|LATERAL") String referralType,@Pattern(regexp="INITIATED|ACCEPTED|ARRIVED|FEEDBACK_RECORDED|CLOSED|REJECTED") String status,
    @Positive Long fromOrgId,@Positive Long toOrgId,LocalDate from,LocalDate to,Boolean open,Boolean overdue) {}
