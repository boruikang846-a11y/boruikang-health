package com.bgssai.health.health.dto;

import com.bgssai.health.health.HealthStatus;

/**
 * 存活探针响应，由 {@code GET /bgssai/health/liveness} 返回（Standards §13.3）。
 * 只证明进程与 HTTP 端口可服务，完全不触碰任何依赖——这样数据库故障永远不会被 systemd 升级成
 * 对一个本来健康的进程的重启风暴。
 */
public class LivenessReport {

    private HealthStatus status;

    private String app;

    private String profile;

    private long uptimeSeconds;

    private String checkedAt;

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
}
