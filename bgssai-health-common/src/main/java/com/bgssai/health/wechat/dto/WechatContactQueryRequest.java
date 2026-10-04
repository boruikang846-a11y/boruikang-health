package com.bgssai.health.wechat.dto;
import jakarta.validation.constraints.*;
public record WechatContactQueryRequest(@Min(0) Integer page,@Min(1) Integer size,@Pattern(regexp="WE_COM|WECHAT_OFFICIAL") String channel,Boolean bound,Boolean pending,
    @Pattern(regexp="ACTIVE|REMOVED") String relation,@Size(max=80) String keyword,@Positive Long patientId) {}
