package com.boruikang.health.common.exception;

public class ForbiddenException extends BizException {

    private static final long serialVersionUID = 1L;

    public ForbiddenException() {
        super(CommonErrorCode.FORBIDDEN);
    }

    public ForbiddenException(String message) {
        super(CommonErrorCode.FORBIDDEN, message);
    }

    public ForbiddenException(Throwable cause) {
        super(CommonErrorCode.FORBIDDEN, cause);
    }

    public ForbiddenException(String message, Throwable cause) {
        super(CommonErrorCode.FORBIDDEN, message, cause);
    }
}
