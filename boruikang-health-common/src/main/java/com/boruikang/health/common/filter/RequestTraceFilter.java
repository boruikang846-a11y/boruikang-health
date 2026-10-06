package com.boruikang.health.common.filter;

import java.io.IOException;
import java.util.UUID;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.boruikang.health.common.logging.MdcSupport;

/**
 * 请求入口注入 traceId 到 MDC，供 logback pattern 自动输出，便于全链路排障。
 * 仅管理 traceId，不打印接口入参/出参（日志规范）。
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestTraceFilter extends OncePerRequestFilter {

    private static final String HEADER_TRACE_ID = "X-Trace-Id";
    private static final String HEADER_REQUEST_ID = "X-Request-Id";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String traceId = resolveTraceId(request);
        MdcSupport.putTraceId(traceId);
        response.setHeader(HEADER_TRACE_ID, traceId);
        try {
            filterChain.doFilter(request, response);
        } finally {
            MdcSupport.clearTraceId();
        }
    }

    private String resolveTraceId(HttpServletRequest request) {
        String fromHeader = request.getHeader(HEADER_TRACE_ID);
        if (fromHeader != null && !fromHeader.isBlank()) {
            return fromHeader.trim();
        }
        fromHeader = request.getHeader(HEADER_REQUEST_ID);
        if (fromHeader != null && !fromHeader.isBlank()) {
            return fromHeader.trim();
        }
        return UUID.randomUUID().toString().replace("-", "");
    }
}
