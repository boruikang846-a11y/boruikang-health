package com.boruikang.health.servicecenter.dto;
import java.time.LocalDateTime;
public record ServiceEntryIssuedResponse(Long id,String token,String path,LocalDateTime expiresAt,boolean mock) {}
