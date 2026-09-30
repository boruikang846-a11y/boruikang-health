package com.bgssai.health.common;

import com.bgssai.health.common.aop.UserContext;

/**
 * Admin role check utility.
 * Works with @NeedAop: JwtTokenAspect writes the role claim into UserContext,
 * this class reads it. Zero trust: role comes from the JWT, not from client request params.
 * New products rename ADMIN_ROLE / this class to match their own role model.
 * Rejection has exactly one path: callers check {@link #isAdmin()} and throw
 * ForbiddenException, which GlobalExceptionHandler renders as code 4003.
 */
public final class AdminAuthGuard {

    public static final String ADMIN_ROLE = "PLATFORM_ADMIN";

    private AdminAuthGuard() {
        throw new IllegalStateException("Utility class");
    }

    public static boolean isAdmin() {
        String role = UserContext.getUserRole();
        return ADMIN_ROLE.equals(role);
    }
}
