package com.boruikang.health.health.indicator;

import java.lang.management.ManagementFactory;
import java.lang.management.MemoryUsage;
import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.boruikang.health.health.HealthComponentType;
import com.boruikang.health.health.HealthStatus;
import com.boruikang.health.health.dto.ComponentHealth;

/**
 * {@code jvm_memory} —— 本进程的堆占用与活跃线程数。
 * 超过配置的堆占比阈值报 {@code DEGRADED}；永不报 {@code DOWN}——一个还能应答这个请求的进程，
 * 按定义就还在服务。
 */
@Component
public class JvmMemoryHealthIndicator implements HealthIndicator {

    private static final Logger log = LoggerFactory.getLogger(JvmMemoryHealthIndicator.class);

    private static final long BYTES_PER_MB = 1024L * 1024L;

    private final int heapThresholdPercent;

    public JvmMemoryHealthIndicator(
            @Value("${boruikang.health.heap-used-threshold-percent:90}") int heapThresholdPercent) {
        this.heapThresholdPercent = heapThresholdPercent;
    }

    @Override
    public String name() {
        return "jvm_memory";
    }

    @Override
    public HealthComponentType type() {
        return HealthComponentType.RUNTIME;
    }

    @Override
    public boolean critical() {
        return false;
    }

    @Override
    public ComponentHealth check() {
        MemoryUsage heap = ManagementFactory.getMemoryMXBean().getHeapMemoryUsage();
        long usedMb = heap.getUsed() / BYTES_PER_MB;
        long maxMb = heap.getMax() < 0 ? -1L : heap.getMax() / BYTES_PER_MB;
        int usedPercent = heap.getMax() <= 0 ? 0 : (int) (heap.getUsed() * 100L / heap.getMax());

        Map<String, String> metrics = new LinkedHashMap<>();
        metrics.put("heap_used_mb", String.valueOf(usedMb));
        metrics.put("heap_max_mb", String.valueOf(maxMb));
        metrics.put("heap_used_percent", String.valueOf(usedPercent));
        metrics.put("heap_used_threshold_percent", String.valueOf(heapThresholdPercent));
        metrics.put("thread_count", String.valueOf(ManagementFactory.getThreadMXBean().getThreadCount()));

        if (heap.getMax() <= 0) {
            return ComponentHealth.of(name(), type(), critical(), HealthStatus.UP,
                    "heap max undefined, ratio not evaluated", metrics);
        }
        if (usedPercent >= heapThresholdPercent) {
            log.warn("health check jvm_memory heap pressure heapUsedPercent={} threshold={}",
                    usedPercent, heapThresholdPercent);
            return ComponentHealth.of(name(), type(), critical(), HealthStatus.DEGRADED,
                    "heap usage at or above threshold", metrics);
        }
        return ComponentHealth.of(name(), type(), critical(), HealthStatus.UP,
                "heap usage normal", metrics);
    }
}
