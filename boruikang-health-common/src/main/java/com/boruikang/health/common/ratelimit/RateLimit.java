package com.boruikang.health.common.ratelimit;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Rate limiting annotation. Token bucket algorithm via Bucket4j.
 * Annotate controller method or class; RateLimitAspect intercepts.
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface RateLimit {

    int capacity() default 10;

    int refillPerMinute() default 10;

    Key keyBy() default Key.IP;

    enum Key {
        IP,
        USER,
        IP_AND_USER
    }
}
