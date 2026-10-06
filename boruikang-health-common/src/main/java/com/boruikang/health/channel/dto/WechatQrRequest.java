package com.boruikang.health.channel.dto;
import jakarta.validation.constraints.*;
public record WechatQrRequest(@NotNull @Positive Long id,@NotBlank @Pattern(regexp="WE_COM|WECHAT_OFFICIAL") String provider) {}
