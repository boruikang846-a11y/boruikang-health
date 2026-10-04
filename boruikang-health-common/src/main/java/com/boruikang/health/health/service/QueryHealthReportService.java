package com.boruikang.health.health.service;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.boruikang.health.health.HealthContext;
import com.boruikang.health.health.HealthStatus;
import com.boruikang.health.health.dto.ComponentHealth;
import com.boruikang.health.health.dto.HealthReport;
import com.boruikang.health.health.dto.HealthSnapshot;

/**
 * {@code GET /boruikang/health}。覆盖每个组件的全量报告：状态、类型、是否关键、耗时、说明与白名单指标。
 */
@Service
public class QueryHealthReportService {

    private static final Logger log = LoggerFactory.getLogger(QueryHealthReportService.class);

    @Autowired
    private HealthProbeRunner healthProbeRunner;

    @Autowired
    private HealthContext healthContext;

    public HealthReport report() {
        log.info("health full report app={}", healthContext.appName());

        HealthSnapshot snapshot = healthProbeRunner.snapshot();
        List<ComponentHealth> components = snapshot.getComponents();
        HealthStatus status = HealthProbeRunner.aggregate(components);

        int upCount = 0;
        int degradedCount = 0;
        int downCount = 0;
        for (ComponentHealth component : components) {
            if (component.getStatus() == HealthStatus.UP) {
                upCount++;
            } else if (component.getStatus() == HealthStatus.DEGRADED) {
                degradedCount++;
            } else {
                downCount++;
            }
        }

        if (status != HealthStatus.UP) {
            log.warn("health report not up app={} status={} components={}",
                    healthContext.appName(), status, HealthProbeRunner.unhealthyNames(components));
        }

        HealthReport report = new HealthReport();
        report.setStatus(status);
        report.setApp(healthContext.appName());
        report.setProfile(healthContext.profile());
        report.setUptimeSeconds(healthContext.uptimeSeconds());
        report.setCheckedAt(healthContext.formatEpochMs(snapshot.getCheckedAtEpochMs()));
        report.setComponentTotal(components.size());
        report.setUpCount(upCount);
        report.setDegradedCount(degradedCount);
        report.setDownCount(downCount);
        report.setComponents(components);
        return report;
    }
}
