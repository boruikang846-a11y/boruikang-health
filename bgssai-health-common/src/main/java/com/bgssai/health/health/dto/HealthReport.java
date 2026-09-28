package com.bgssai.health.health.dto;

import java.util.List;

import com.bgssai.health.health.HealthStatus;

/**
 * 全量健康报告，由 {@code GET /bgssai/health} 返回（Standards §13.3）。
 */
public class HealthReport {

    private HealthStatus status;

    private String app;

    private String profile;

    private long uptimeSeconds;

    private String checkedAt;

    private int componentTotal;

    private int upCount;

    private int degradedCount;

    private int downCount;

    private List<ComponentHealth> components;

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

    public String getProfile() {
        return profile;
    }

    public void setProfile(String profile) {
        this.profile = profile;
    }

    public long getUptimeSeconds() {
        return uptimeSeconds;
    }

    public void setUptimeSeconds(long uptimeSeconds) {
        this.uptimeSeconds = uptimeSeconds;
    }

    public String getCheckedAt() {
        return checkedAt;
    }

    public void setCheckedAt(String checkedAt) {
        this.checkedAt = checkedAt;
    }

    public int getComponentTotal() {
        return componentTotal;
    }

    public void setComponentTotal(int componentTotal) {
        this.componentTotal = componentTotal;
    }

    public int getUpCount() {
        return upCount;
    }

    public void setUpCount(int upCount) {
        this.upCount = upCount;
    }

    public int getDegradedCount() {
        return degradedCount;
    }

    public void setDegradedCount(int degradedCount) {
        this.degradedCount = degradedCount;
    }

    public int getDownCount() {
        return downCount;
    }

    public void setDownCount(int downCount) {
        this.downCount = downCount;
    }

    public List<ComponentHealth> getComponents() {
        return components;
    }

    public void setComponents(List<ComponentHealth> components) {
        this.components = components;
    }
}
