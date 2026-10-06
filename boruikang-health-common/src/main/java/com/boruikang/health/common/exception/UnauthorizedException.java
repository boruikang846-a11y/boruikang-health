package com.boruikang.health.common.exception;

public class UnauthorizedException extends BizException {

    private static final long serialVersionUID = 1L;

    public UnauthorizedException() {
        super(CommonErrorCode.UNAUTHORIZED);
    }

    public UnauthorizedException(String message) {
        super(CommonErrorCode.UNAUTHORIZED, message);
    }

    public UnauthorizedException(Throwable cause) {
        super(CommonErrorCode.UNAUTHORIZED, cause);
    }

    public UnauthorizedException(String message, Throwable cause) {
        super(CommonErrorCode.UNAUTHORIZED, message, cause);
    }
}
