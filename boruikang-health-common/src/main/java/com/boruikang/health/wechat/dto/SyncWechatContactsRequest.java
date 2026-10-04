package com.boruikang.health.wechat.dto;
import jakarta.validation.constraints.*;
public record SyncWechatContactsRequest(@NotBlank @Pattern(regexp="WE_COM|WECHAT_OFFICIAL") String provider) {}
