package com.boruikang.health.health;

import org.springframework.http.HttpStatus;

/**
 * 把聚合后的健康状态映射为 HTTP 状态码（Standards §13.3）。
 *
 * <p>{@code DOWN} 映射 503，其余一律 200。这是与 {@code deploy/remote-deploy.sh} 共享的唯一前提：
 * 部署脚本的探测口径是「2xx/3xx/401/403/404 视为健康，5xx 视为不健康并回滚上一个可用 jar」。
 * 因此 {@code DEGRADED} 必须留在 200——磁盘偏紧或队列偏长不该被升级成一次失败的发布。</p>
 */
public final class HealthHttpStatus {

    private HealthHttpStatus() {
        throw new IllegalStateException("Utility class");
    }

    public static HttpStatus of(HealthStatus status) {
        return status == HealthStatus.DOWN ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.OK;
    }
}
