package com.bgssai.health.wechat.dto;
import jakarta.validation.constraints.*;
/** Blank secret, callback token or AES key keeps the stored value. */
public record SaveWechatConfigRequest(@NotBlank @Pattern(regexp="WE_COM|WECHAT_OFFICIAL") String provider,@NotBlank @Pattern(regexp="[A-Za-z0-9_-]{6,64}") String appId,@Size(max=200) String secret,
    @Pattern(regexp="|[A-Za-z0-9]{3,32}") String callbackToken,@Pattern(regexp="|[A-Za-z0-9]{43}") String aesKey,@NotBlank @Pattern(regexp="LIVE|MOCK") String mode,@NotNull Boolean enabled) {}
