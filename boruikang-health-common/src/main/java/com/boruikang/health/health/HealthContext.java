package com.boruikang.health.health;

import java.lang.management.ManagementFactory;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * 三个健康端点共享的进程级事实：应用名、生效启动档、JVM 运行时长与时间格式化。
 *
 * <p>只放非敏感事实（Standards §13.4）：不含主机、端口、路径、连接串。运行时长取自 JVM RuntimeMXBean
 * 而非 Spring 上下文启动时间，这样上下文仍在刷新时也能给出读数。</p>
 */
@Component
public class HealthContext {

    private static final DateTimeFormatter TIMESTAMP = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final String appName;

    private final String profile;

    public HealthContext(
            @Value("${spring.application.name:boruikang-health}") String appName,
            Environment environment) {
        this.appName = appName;
        String[] activeProfiles = environment.getActiveProfiles();
        this.profile = activeProfiles.length == 0 ? "default" : String.join(",", activeProfiles);
    }

    public String appName() {
        return appName;
    }

    public String profile() {
        return profile;
    }

    public long uptimeSeconds() {
        return ManagementFactory.getRuntimeMXBean().getUptime() / 1000L;
    }

    public String formatEpochMs(long epochMs) {
        return TIMESTAMP.format(Instant.ofEpochMilli(epochMs).atZone(ZoneId.systemDefault()));
    }

    public String nowText() {
        return formatEpochMs(System.currentTimeMillis());
    }
}
