package com.boruikang.health.wechat.dto;
import jakarta.validation.constraints.*;
public record VerifyWechatConfigRequest(@NotBlank @Pattern(regexp="WE_COM|WECHAT_OFFICIAL") String provider) {}
