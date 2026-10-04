package com.bgssai.health.wechat.dto;
import java.time.LocalDateTime;
public record WechatMessageResponse(Long id,Long contactId,String channel,String direction,String kind,String content,String templateCode,Long taskId,String status,
    String externalMsgId,String error,Long actorId,LocalDateTime sentAt,LocalDateTime handledAt,Boolean mock) {}
