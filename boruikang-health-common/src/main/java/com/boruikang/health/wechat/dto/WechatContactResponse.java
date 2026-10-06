package com.boruikang.health.wechat.dto;
import java.time.LocalDateTime;
/** A WeChat friend or follower; patientId is null until staff bind it to a patient record. */
public record WechatContactResponse(Long id,String channel,String externalId,String nickname,String staffUserId,Long staffAccountId,Long intakeChannelId,String relation,
    LocalDateTime followedAt,LocalDateTime removedAt,LocalDateTime lastInboundAt,LocalDateTime lastMessageAt,String lastMessagePreview,Integer pendingCount,
    Long patientId,String patientName,LocalDateTime boundAt,Boolean mock,Integer version) {}
