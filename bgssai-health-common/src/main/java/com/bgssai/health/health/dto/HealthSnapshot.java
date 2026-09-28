package com.bgssai.health.health.dto;

import java.util.List;

/**
 * 一批组件结果加上它们产生的墙钟时刻。{@code HealthProbeRunner} 按
 * {@code bgssai.health.cache-ttl-ms} 缓存的就是它（Standards §13.5），使一阵密集探测共享一次组件
 * 遍历，而不是每个请求都往数据库打一轮。
 *
 * <p>内部类型：永不序列化给客户端。端点把它投影成 {@link HealthReport} / {@link ReadinessReport}。</p>
 */
public class HealthSnapshot {

    private final long checkedAtEpochMs;

    private final List<ComponentHealth> components;

    public HealthSnapshot(long checkedAtEpochMs, List<ComponentHealth> components) {
        this.checkedAtEpochMs = checkedAtEpochMs;
        this.components = components;
    }

    public long getCheckedAtEpochMs() {
        return checkedAtEpochMs;
    }

    public List<ComponentHealth> getComponents() {
        return components;
    }
}
