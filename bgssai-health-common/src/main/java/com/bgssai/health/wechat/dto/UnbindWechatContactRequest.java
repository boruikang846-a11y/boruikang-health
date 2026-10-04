package com.bgssai.health.wechat.dto;
import jakarta.validation.constraints.*;
public record UnbindWechatContactRequest(@NotNull @Positive Long id,@NotNull @Min(0) Integer version,@NotBlank @Size(max=300) String reason) {}
