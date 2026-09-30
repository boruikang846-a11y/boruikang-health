package com.bgssai.health.message.dto;
import jakarta.validation.constraints.*;
public record CreateMessageRequest(@NotBlank @Size(max=2000) String content) {}
