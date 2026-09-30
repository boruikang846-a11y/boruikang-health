package com.bgssai.health.health.service;

import java.util.ArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.bgssai.health.health.HealthContext;
import com.bgssai.health.health.HealthStatus;
import com.bgssai.health.health.dto.ComponentHealth;
import com.bgssai.health.health.dto.HealthSnapshot;
import com.bgssai.health.health.dto.ReadinessComponent;
import com.bgssai.health.health.dto.ReadinessReport;

/**
 * {@code GET /bgssai/health/readiness}。只探测、也只由 critical 组件决定结论；响应仅带组件名与状态
 * ——探针不需要更多，而公开端点上更小的响应体就是更小的暴露面。
 */
@Service
public class QueryReadinessService {

    private static final Logger log = LoggerFactory.getLogger(QueryReadinessService.class);

    @Autowired
    private HealthProbeRunner healthProbeRunner;

    @Autowired
    private HealthContext healthContext;

    public ReadinessReport readiness() {
        log.info("health readiness probe app={}", healthContext.appName());

        HealthSnapshot snapshot = healthProbeRunner.criticalSnapshot();
        HealthStatus status = HealthProbeRunner.aggregateCritical(snapshot.getComponents());

        List<ReadinessComponent> criticalComponents = new ArrayList<>();
        for (ComponentHealth component : snapshot.getComponents()) {
            criticalComponents.add(ReadinessComponent.of(component.getName(), component.getStatus()));
        }

        if (status != HealthStatus.UP) {
            log.warn("health readiness not up app={} status={} components={}",
                    healthContext.appName(), status, HealthProbeRunner.unhealthyNames(snapshot.getComponents()));
        }

        ReadinessReport report = new ReadinessReport();
        report.setStatus(status);
        report.setApp(healthContext.appName());
        report.setCheckedAt(healthContext.formatEpochMs(snapshot.getCheckedAtEpochMs()));
        report.setComponents(criticalComponents);
        return report;
    }
}
