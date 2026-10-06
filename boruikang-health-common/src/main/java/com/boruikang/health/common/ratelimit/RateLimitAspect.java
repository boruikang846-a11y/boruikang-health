package com.boruikang.health.common.ratelimit;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

import jakarta.servlet.http.HttpServletRequest;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import com.boruikang.health.common.aop.UserContext;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import io.github.bucket4j.Refill;

/**
 * Rate limiting AOP. Enforces @RateLimit annotations via token bucket (Bucket4j).
 * In-process ConcurrentHashMap storage; replace with Bucket4j Redis backend for multi-instance.
 */
@Aspect
@Component
public class RateLimitAspect {

    private static final Logger log = LoggerFactory.getLogger(RateLimitAspect.class);

    private final ConcurrentMap<String, Bucket> buckets = new ConcurrentHashMap<>();

    @Around("@annotation(rateLimit)")
    public Object enforce(ProceedingJoinPoint pjp, RateLimit rateLimit) throws Throwable {
        String endpointKey = endpointKey(pjp);
        switch (rateLimit.keyBy()) {
            case IP:
                consumeOrThrow(endpointKey, "ip:" + clientIp(), rateLimit);
                break;
            case USER:
                consumeOrThrow(endpointKey, "user:" + currentUser(), rateLimit);
                break;
            case IP_AND_USER:
                consumeOrThrow(endpointKey, "ip:" + clientIp(), rateLimit);
                consumeOrThrow(endpointKey, "user:" + currentUser(), rateLimit);
                break;
            default:
                break;
        }
        return pjp.proceed();
    }

    private void consumeOrThrow(String endpointKey, String dimensionKey, RateLimit cfg) {
        String fullKey = endpointKey + "|" + dimensionKey;
        Bucket bucket = buckets.computeIfAbsent(fullKey, k -> newBucket(cfg));
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (!probe.isConsumed()) {
            log.warn("[RateLimit] reject endpoint={} key={} retryAfterNs={}",
                    endpointKey, dimensionKey, probe.getNanosToWaitForRefill());
            throw new RateLimitExceededException(probe.getNanosToWaitForRefill());
        }
    }

    private static Bucket newBucket(RateLimit cfg) {
        Bandwidth limit = Bandwidth.classic(
                cfg.capacity(),
                Refill.greedy(cfg.refillPerMinute(), Duration.ofMinutes(1)));
        return Bucket.builder().addLimit(limit).build();
    }

    private static String endpointKey(ProceedingJoinPoint pjp) {
        MethodSignature sig = (MethodSignature) pjp.getSignature();
        return sig.getDeclaringTypeName() + "." + sig.getName();
    }

    private static String clientIp() {
        ServletRequestAttributes attrs =
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs == null) return "no-request";
        HttpServletRequest req = attrs.getRequest();
        String xff = req.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isEmpty()) {
            int comma = xff.indexOf(',');
            return (comma > 0 ? xff.substring(0, comma) : xff).trim();
        }
        String real = req.getHeader("X-Real-IP");
        if (real != null && !real.isEmpty()) return real.trim();
        return req.getRemoteAddr() == null ? "no-ip" : req.getRemoteAddr();
    }

    private static String currentUser() {
        String userId = UserContext.getUserId();
        return (userId == null || userId.isEmpty()) ? "anonymous" : userId;
    }
}
