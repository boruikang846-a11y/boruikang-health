package com.boruikang.health.common.logging;

import org.slf4j.MDC;

/**
 * MDC 上下文键管理：traceId / userId / companyCode 由基础设施注入，业务日志自动携带。
 */
public final class MdcSupport {

    public static final String TRACE_ID = "traceId";
    public static final String USER_ID = "userId";
    public static final String COMPANY_CODE = "companyCode";

    private MdcSupport() {
    }

    public static void putTraceId(String traceId) {
        if (traceId != null && !traceId.isEmpty()) {
            MDC.put(TRACE_ID, traceId);
        }
    }

    public static void putUserContext(String userId, String companyCode) {
        if (userId != null && !userId.isEmpty()) {
            MDC.put(USER_ID, userId);
        }
        if (companyCode != null && !companyCode.isEmpty()) {
            MDC.put(COMPANY_CODE, companyCode);
        }
    }

    public static void clearTraceId() {
        MDC.remove(TRACE_ID);
    }

    public static void clearUserContext() {
        MDC.remove(USER_ID);
        MDC.remove(COMPANY_CODE);
    }
}
