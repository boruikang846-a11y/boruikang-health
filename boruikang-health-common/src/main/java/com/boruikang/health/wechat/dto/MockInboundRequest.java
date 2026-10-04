package com.boruikang.health.wechat.dto;
import jakarta.validation.constraints.*;
/** Simulated follow, message or unfollow for a channel in MOCK mode; handled exactly like a real callback. */
public record MockInboundRequest(@NotBlank @Pattern(regexp="WE_COM|WECHAT_OFFICIAL") String provider,@NotBlank @Pattern(regexp="FOLLOW|TEXT|UNFOLLOW") String event,@NotBlank @Pattern(regexp="[A-Za-z0-9_-]{4,64}") String externalId,
    @Size(max=2000) String text,@Positive Long channelId,@Size(max=64) String staffUserId) {}
