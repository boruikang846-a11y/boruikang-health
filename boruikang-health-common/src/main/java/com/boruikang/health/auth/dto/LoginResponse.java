package com.boruikang.health.auth.dto;
public record LoginResponse(String jwtToken, Long userId, String realName, String roleCode, Long hospitalId) {}
