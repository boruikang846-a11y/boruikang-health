package com.bgssai.health.utils;

import java.nio.charset.StandardCharsets;
import java.util.Date;

import javax.crypto.SecretKey;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

/**
 * JWT utility. Configured at startup via JwtConfig @PostConstruct.
 * Secret injected from jwt.secret property (must be >= 32 chars).
 * Uses jjwt 0.12.x API.
 */
public class JwtUtil {

    private static final Logger log = LoggerFactory.getLogger(JwtUtil.class);

    private static volatile String SECRET_KEY;

    private static volatile long EXPIRATION_TIME_MS = 86400000L;

    private JwtUtil() {}

    static synchronized void configure(String secret, long expirationMs) {
        if (secret == null || secret.isEmpty()) {
            throw new IllegalStateException(
                "jwt.secret not configured — must be set to a random string of at least 32 characters");
        }
        if (secret.length() < 32) {
            throw new IllegalStateException(
                "jwt.secret length is less than 32 characters — use `openssl rand -base64 48` to generate");
        }
        SECRET_KEY = secret;
        EXPIRATION_TIME_MS = expirationMs > 0 ? expirationMs : 86400000L;
        log.info("[JwtUtil] configured: secretLen={}, expirationMs={}", secret.length(), EXPIRATION_TIME_MS);
    }

    private static SecretKey key() {
        String secret = SECRET_KEY;
        if (secret == null) {
            throw new IllegalStateException(
                "JwtUtil not initialised — ensure JwtConfig bean is loaded (@PostConstruct calls configure())");
        }
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public static String generateToken(String userId, String realName, String accountType,
                                       String companyCode, String companyName) {
        return generateToken(userId, realName, accountType, companyCode, companyName, null);
    }

    public static String generateToken(String userId, String realName, String accountType,
                                       String companyCode, String companyName, String role) {
        Date expirationDate = new Date(System.currentTimeMillis() + EXPIRATION_TIME_MS);
        var builder = Jwts.builder()
                          .subject(userId)
                          .claim("realName", realName)
                          .claim("accountType", accountType)
                          .claim("companyCode", companyCode)
                          .claim("companyName", companyName)
                          .expiration(expirationDate)
                          .signWith(key());
        if (role != null && !role.isEmpty()) {
            builder.claim("role", role);
        }
        return builder.compact();
    }

    public static String generateSessionToken(Long id, String realName, String role, String sid) {
        return Jwts.builder().subject(id.toString()).claim("realName", realName).claim("role", role)
            .claim("sid", sid).issuedAt(new Date()).expiration(new Date(System.currentTimeMillis()+EXPIRATION_TIME_MS))
            .signWith(key()).compact();
    }

    public static String getSessionId(String token) { return getClaims(token).get("sid", String.class); }

    public static boolean validateToken(String token) {
        try {
            Jws<Claims> claimsJws = Jwts.parser()
                                        .verifyWith(key())
                                        .build()
                                        .parseSignedClaims(token);
            return !claimsJws.getPayload().getExpiration().before(new Date());
        } catch (JwtException | IllegalArgumentException e) {
            log.debug("Token validation failed type={}", e.getClass().getSimpleName());
            return false;
        }
    }

    public static String getUserIdFromToken(String token) {
        return getClaims(token).getSubject();
    }

    public static String getRealNameFromToken(String token) {
        return getClaims(token).get("realName", String.class);
    }

    public static String getUserAccountType(String token) {
        return getClaims(token).get("accountType", String.class);
    }

    public static String getCompanyCodeFromToken(String token) {
        return getClaims(token).get("companyCode", String.class);
    }

    public static String getCompanyNameFromToken(String token) {
        return getClaims(token).get("companyName", String.class);
    }

    public static String getRoleFromToken(String token) {
        return getClaims(token).get("role", String.class);
    }

    private static Claims getClaims(String token) {
        return Jwts.parser()
                   .verifyWith(key())
                   .build()
                   .parseSignedClaims(token)
                   .getPayload();
    }
}
