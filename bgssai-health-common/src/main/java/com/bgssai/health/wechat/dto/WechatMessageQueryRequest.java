package com.bgssai.health.wechat.dto;
import jakarta.validation.constraints.*;
public record WechatMessageQueryRequest(@NotNull @Positive Long contactId,@Min(0) Integer page,@Min(1) Integer size) {}
