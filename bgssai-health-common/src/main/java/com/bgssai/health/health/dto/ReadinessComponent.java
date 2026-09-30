package com.bgssai.health.health.dto;

import com.bgssai.health.health.HealthStatus;

/**
 * 就绪响应里的单个 critical 组件（Standards §13.3）。刻意只带组件名与状态：探针不需要更多，
 * 而公开端点上更小的响应体就是更小的暴露面。
 */
public class ReadinessComponent {

    private String name;

    private HealthStatus status;

    public static ReadinessComponent of(String name, HealthStatus status) {
        ReadinessComponent component = new ReadinessComponent();
        component.setName(name);
        component.setStatus(status);
        return component;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public HealthStatus getStatus() {
        return status;
    }

    public void setStatus(HealthStatus status) {
        this.status = status;
    }
}
