package com.boruikang.health.invitation.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
/** One invitation round. Reached results close the open first-contact task; unreached rounds count towards lost-contact escalation. */
public record CreateInvitationRequest(@NotNull @Positive Long patientId,@Positive Long screeningId,@Positive Long campaignId,
    @NotNull @PastOrPresent LocalDateTime invitedAt,@NotBlank @Pattern(regexp="PHONE|SMS|WECHAT|IN_PERSON|OTHER") String method,
    @NotBlank @Pattern(regexp="WILLING|UNDECIDED|REFUSED|ALREADY_TREATED|TREATED_ELSEWHERE|NO_ANSWER|BUSY|WRONG_NUMBER|FAMILY_ANSWERED|DECEASED|OTHER") String result,
    @Pattern(regexp="SELF|FAMILY_ESCORT|GREEN_CHANNEL|UNDECIDED") String plannedVisitMode,@NotBlank @Size(max=1000) String summary,
    LocalDateTime nextInviteAt,@NotBlank @Size(max=1000) String evidence,@NotBlank @Pattern(regexp="[a-zA-Z0-9-]{1,80}") String requestKey) {}
