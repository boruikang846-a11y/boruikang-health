package com.boruikang.health.invitation.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
public record InvitationQueryRequest(@Min(0) Integer page,@Min(1) Integer size,@Positive Long patientId,@Positive Long screeningId,@Positive Long campaignId,
    @Pattern(regexp="WILLING|UNDECIDED|REFUSED|ALREADY_TREATED|TREATED_ELSEWHERE|NO_ANSWER|BUSY|WRONG_NUMBER|FAMILY_ANSWERED|DECEASED|OTHER") String result,
    @Pattern(regexp="PHONE|SMS|WECHAT|IN_PERSON|OTHER") String method,@Positive Long actorId,LocalDate invitedFrom,LocalDate invitedTo,Boolean reached) {}
