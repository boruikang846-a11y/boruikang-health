package com.bgssai.health.common.ratelimit;

import com.bgssai.health.common.exception.BizException;
import com.bgssai.health.common.exception.CommonErrorCode;

/**
 * Thrown by RateLimitAspect when bucket is exhausted.
 * GlobalExceptionHandler converts to HTTP 429 + Retry-After header.
 */
public class RateLimitExceededException extends BizException {

    private static final long serialVersionUID = 1L;

    private final long nanosToWaitForRefill;

    public RateLimitExceededException(long nanosToWaitForRefill) {
        super(CommonErrorCode.RATE_LIMIT_EXCEEDED, "too many requests");
        this.nanosToWaitForRefill = nanosToWaitForRefill;
    }

    public long getNanosToWaitForRefill() {
        return nanosToWaitForRefill;
    }

    public long getRetryAfterSeconds() {
        long sec = nanosToWaitForRefill / 1_000_000_000L;
        return sec < 1 ? 1 : sec;
    }
}
