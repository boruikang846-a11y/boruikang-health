package com.boruikang.health.health.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.boruikang.health.health.HealthContext;
import com.boruikang.health.health.HealthStatus;
import com.boruikang.health.health.dto.LivenessReport;

/**
 * {@code GET /boruikang/health/liveness}。完全不触碰任何依赖——不碰数据库、不碰缓存，连探针 runner 都
 * 不走——所以数据库故障永远不会被 systemd 升级成对一个本来健康的进程的重启风暴。
 */
@Service
public class QueryLivenessService {

    private static final Logger log = LoggerFactory.getLogger(QueryLivenessService.class);

    @Autowired
    private HealthContext healthContext;

    public LivenessReport liveness() {
        long uptimeSeconds = healthContext.uptimeSeconds();
        log.info("health liveness probe app={} uptimeSeconds={}", healthContext.appName(), uptimeSeconds);

        LivenessReport report = new LivenessReport();
        report.setStatus(HealthStatus.UP);
        report.setApp(healthContext.appName());
        report.setProfile(healthContext.profile());
        report.setUptimeSeconds(uptimeSeconds);
        report.setCheckedAt(healthContext.nowText());
        return report;
    }
}
