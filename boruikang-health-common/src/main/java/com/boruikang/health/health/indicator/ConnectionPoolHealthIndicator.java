package com.boruikang.health.health.indicator;

import java.util.LinkedHashMap;
import java.util.Map;

import javax.sql.DataSource;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.alibaba.druid.pool.DruidDataSource;
import com.boruikang.health.health.HealthComponentType;
import com.boruikang.health.health.HealthStatus;
import com.boruikang.health.health.dto.ComponentHealth;

/**
 * {@code datasource_pool} —— Druid 连接池（中间件）。只报饱和度；数据库可达性的结论归 {@code db}
 * 组件，因此本组件永不返回 {@code DOWN}：池压力通常是瞬时的，回滚一个版本也修不好它。
 *
 * <p>只读计数器——永不读池的 URL / 用户名 / 口令字段（Standards §13.4）。</p>
 */
@Component
public class ConnectionPoolHealthIndicator implements HealthIndicator {

    private static final Logger log = LoggerFactory.getLogger(ConnectionPoolHealthIndicator.class);

    private final DataSource dataSource;

    private final int activeThresholdPercent;

    public ConnectionPoolHealthIndicator(
            DataSource dataSource,
            @Value("${boruikang.health.pool-active-threshold-percent:90}") int activeThresholdPercent) {
        this.dataSource = dataSource;
        this.activeThresholdPercent = activeThresholdPercent;
    }

    @Override
    public String name() {
        return "datasource_pool";
    }

    @Override
    public HealthComponentType type() {
        return HealthComponentType.MIDDLEWARE;
    }

    @Override
    public boolean critical() {
        return false;
    }

    @Override
    public ComponentHealth check() {
        Map<String, String> metrics = new LinkedHashMap<>();

        if (!(dataSource instanceof DruidDataSource druid)) {
            return ComponentHealth.of(name(), type(), critical(), HealthStatus.UP,
                    "pool metrics unavailable for this datasource implementation", metrics);
        }

        int activeCount = druid.getActiveCount();
        int poolingCount = druid.getPoolingCount();
        int maxActive = druid.getMaxActive();
        int waitThreadCount = druid.getWaitThreadCount();
        int activeUsedPercent = maxActive <= 0 ? 0 : (int) (activeCount * 100L / maxActive);

        metrics.put("active_count", String.valueOf(activeCount));
        metrics.put("pooling_count", String.valueOf(poolingCount));
        metrics.put("max_active", String.valueOf(maxActive));
        metrics.put("wait_thread_count", String.valueOf(waitThreadCount));
        metrics.put("active_used_percent", String.valueOf(activeUsedPercent));
        metrics.put("active_used_threshold_percent", String.valueOf(activeThresholdPercent));

        if (waitThreadCount > 0) {
            log.warn("health check datasource_pool has waiting threads waitThreadCount={} activeCount={} maxActive={}",
                    waitThreadCount, activeCount, maxActive);
            return ComponentHealth.of(name(), type(), critical(), HealthStatus.DEGRADED,
                    "threads are waiting for a pooled connection", metrics);
        }
        if (maxActive > 0 && activeUsedPercent >= activeThresholdPercent) {
            log.warn("health check datasource_pool near saturation activeUsedPercent={} threshold={}",
                    activeUsedPercent, activeThresholdPercent);
            return ComponentHealth.of(name(), type(), critical(), HealthStatus.DEGRADED,
                    "active connections at or above threshold", metrics);
        }
        return ComponentHealth.of(name(), type(), critical(), HealthStatus.UP, "pool healthy", metrics);
    }
}
