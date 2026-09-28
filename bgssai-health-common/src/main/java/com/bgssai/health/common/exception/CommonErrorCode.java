package com.bgssai.health.common.exception;

/**
 * Single source of truth for response codes, mirrored by the error-code table in
 * docs/api/README.md. Every layer that reports one of these conditions (login services,
 * JwtTokenAspect, GlobalExceptionHandler, role guards) must use these constants rather than a
 * literal, so one condition never ends up with two codes.
 */
public enum CommonErrorCode implements ErrorCode {

    SUCCESS("0", "OK"),
    SYSTEM_ERROR("999999", "system error"),
    BIZ_ERROR("100000", "business error"),
    INVALID_PARAM("50000001", "invalid request parameter"),
    INVALID_CREDENTIALS("4001", "invalid credentials"),
    UNAUTHORIZED("2002", "token validation failed"),
    FORBIDDEN("4003", "no permission"),
    RESOURCE_NOT_FOUND("404000", "resource not found"),
    REQUEST_TOO_LARGE("413000", "request too large"),
    RATE_LIMIT_EXCEEDED("429000", "too many requests, please try again later"),
    UPSTREAM_ERROR("502000", "upstream service error"),
    UPSTREAM_TIMEOUT("504000", "upstream service timeout");

    private final String code;

    private final String message;

    CommonErrorCode(String code, String message) {
        this.code = code;
        this.message = message;
    }

    @Override
    public String code() {
        return code;
    }

    @Override
    public String message() {
        return message;
    }
}
