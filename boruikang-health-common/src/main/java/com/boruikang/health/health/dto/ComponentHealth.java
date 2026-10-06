package com.boruikang.health.health.dto;

import java.util.LinkedHashMap;
import java.util.Map;

import com.boruikang.health.health.HealthComponentType;
import com.boruikang.health.health.HealthStatus;

/**
 * 单个组件的健康结果（Standards §13.3）。走全局 snake_case 序列化策略，所以 {@code latencyMs}
 * 到达客户端时是 {@code latency_ms}。
 */
public class ComponentHealth {

    private String name;

    private HealthComponentType type;

    /** 是否参与就绪判定（Standards §4：布尔字段不加 is 前缀）。 */
    private boolean critical;

    private HealthStatus status;

    private long latencyMs;

    /** 失败时只写异常类型名——不含异常原文、不含堆栈（Standards §13.4）。 */
    private String message;

    /**
     * 非敏感的计数 / 比率 / 阈值，键为 snake_case。
     *
     * <p>这是 Standards §5 明确允许的 {@code Map<String, String>} 情形：它是强类型 DTO 里一个有名字的
     * 字段，其业务语义本就是开放键值袋，且值类型收窄为 {@code String} 而非 {@code Object}；传输载体
     * 本身仍是强类型对象。该 map 永不承载凭据、主机或路径。</p>
     */
    private Map<String, String> metrics;

    public static ComponentHealth of(String name, HealthComponentType type, boolean critical,
            HealthStatus status, String message, Map<String, String> metrics) {
        ComponentHealth component = new ComponentHealth();
        component.setName(name);
        component.setType(type);
        component.setCritical(critical);
        component.setStatus(status);
        component.setMessage(message);
        component.setMetrics(metrics == null ? new LinkedHashMap<>() : metrics);
        return component;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public HealthComponentType getType() {
        return type;
    }

    public void setType(HealthComponentType type) {
        this.type = type;
    }

    public boolean isCritical() {
        return critical;
    }

    public void setCritical(boolean critical) {
        this.critical = critical;
    }

    public HealthStatus getStatus() {
        return status;
    }

    public void setStatus(HealthStatus status) {
        this.status = status;
    }

    public long getLatencyMs() {
        return latencyMs;
    }

    public void setLatencyMs(long latencyMs) {
        this.latencyMs = latencyMs;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Map<String, String> getMetrics() {
        return metrics;
    }

    public void setMetrics(Map<String, String> metrics) {
        this.metrics = metrics;
    }
}
