package com.boruikang.health.invitation.dto;
import java.time.LocalDateTime;
public record InvitationResponse(Long id,Long patientId,String patientName,Long screeningId,Long campaignId,Integer round,LocalDateTime invitedAt,String method,String result,boolean reached,
    String plannedVisitMode,String summary,LocalDateTime nextInviteAt,Long actorId,String evidence,LocalDateTime gmtCreate) {}
