package com.boruikang.health.health.dto;

import java.util.List;

import com.boruikang.health.health.HealthStatus;

/**
 * 就绪探针响应，由 {@code GET /boruikang/health/readiness} 返回（Standards §13.3）。
 * 只检查也只由 critical 组件决定结论，所以一个劣化的非 critical 组件永远不会让发布失败。
 */
public class ReadinessReport {

    private HealthStatus status;

    private String app;

    private String checkedAt;

    private List<ReadinessComponent> components;

    public HealthStatus getStatus() {
        return status;
    }

    public void setStatus(HealthStatus status) {
        this.status = status;
    }

    public String getApp() {
        return app;
    }

    public void setApp(String app) {
        this.app = app;
    }

    public String getCheckedAt() {
        return checkedAt;
    }

    public void setCheckedAt(String checkedAt) {
        this.checkedAt = checkedAt;
    }

    public List<ReadinessComponent> getComponents() {
        return components;
    }

    public void setComponents(List<ReadinessComponent> components) {
        this.components = components;
    }
}
