package com.boruikang.health.health.indicator;

import java.io.File;
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
 * {@code disk_space} —— 应用工作目录所在卷的剩余空间；线上主机上滚动应用日志也写在这个卷。
 *
 * <p>路径本身永不进响应（Standards §13.4）：只暴露剩余 / 总量与阈值。</p>
 */
@Component
public class DiskSpaceHealthIndicator implements HealthIndicator {

    private static final Logger log = LoggerFactory.getLogger(DiskSpaceHealthIndicator.class);

    private static final long BYTES_PER_MB = 1024L * 1024L;

    private final long freeThresholdMb;

    public DiskSpaceHealthIndicator(
            @Value("${boruikang.health.disk-free-threshold-mb:512}") long freeThresholdMb) {
        this.freeThresholdMb = freeThresholdMb;
    }

    @Override
    public String name() {
        return "disk_space";
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
        File workingDir = new File(System.getProperty("user.dir", "."));
        long totalMb = workingDir.getTotalSpace() / BYTES_PER_MB;
        long freeMb = workingDir.getUsableSpace() / BYTES_PER_MB;

        Map<String, String> metrics = new LinkedHashMap<>();
        metrics.put("free_mb", String.valueOf(freeMb));
        metrics.put("total_mb", String.valueOf(totalMb));
        metrics.put("free_threshold_mb", String.valueOf(freeThresholdMb));

        if (totalMb == 0L) {
            log.warn("health check disk_space working directory not readable");
            return ComponentHealth.of(name(), type(), critical(), HealthStatus.DOWN,
                    "working directory not readable", metrics);
        }
        if (freeMb < freeThresholdMb) {
            log.warn("health check disk_space low freeMb={} thresholdMb={}", freeMb, freeThresholdMb);
            return ComponentHealth.of(name(), type(), critical(), HealthStatus.DEGRADED,
                    "free disk space below threshold", metrics);
        }
        return ComponentHealth.of(name(), type(), critical(), HealthStatus.UP,
                "free disk space sufficient", metrics);
    }
}
