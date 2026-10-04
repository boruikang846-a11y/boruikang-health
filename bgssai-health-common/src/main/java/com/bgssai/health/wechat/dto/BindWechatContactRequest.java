package com.bgssai.health.wechat.dto;
import jakarta.validation.constraints.*;
public record BindWechatContactRequest(@NotNull @Positive Long id,@NotNull @Min(0) Integer version,@NotNull @Positive Long patientId) {}
