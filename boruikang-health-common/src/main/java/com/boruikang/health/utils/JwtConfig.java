package com.boruikang.health.utils;

import jakarta.annotation.PostConstruct;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

/**
 * Injects jwt.secret and jwt.expiration-ms into JwtUtil's static fields at startup.
 * jwt.secret must be set in the active profile's properties file (>= 32 chars literal value).
 */
@Configuration
public class JwtConfig {

    @Value("${jwt.secret:}")
    private String secret;

    @Value("${jwt.expiration-ms:86400000}")
    private long expirationMs;

    @PostConstruct
    public void init() {
        JwtUtil.configure(secret, expirationMs);
    }
}
