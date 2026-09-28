package com.bgssai.health.health.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicReference;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Component;

import com.bgssai.health.health.HealthMessages;
import com.bgssai.health.health.HealthStatus;
import com.bgssai.health.health.dto.ComponentHealth;
import com.bgssai.health.health.dto.HealthSnapshot;
import com.bgssai.health.health.indicator.HealthIndicator;

/**
 * 跑完每一个 {@link HealthIndicator}，隔离它们的失败、计时、排序并缓存整批结果（Standards §13.5）。
 *
 * <p>检查逐个执行，但跑在 {@code configuration/AsyncConfig} 声明的 {@code healthProbeExecutor} 上
 * （Standards §4：线程池集中声明并命名），而不是内联在请求线程上——这样每次检查才能被赋予一个硬
 * 截止时间。这个截止时间不是装饰：Druid 的 {@code maxWait} 默认「无限等待」，数据库不可达时裸调
 * {@code getConnection()} 永不返回。若内联执行，反复探测会把 Tomcat 线程一条条钉死，直到连存活探针
 * 都不再应答——健康检查自己制造了它本该报告的故障。</p>
 *
 * <p>TTL 缓存是让公开端点不至于变成流量放大器的关键：TTL 窗口内的一阵探测共享一次组件遍历，而不是
 * 每个请求都往数据库打一个来回。对探针限流被否决了——429 在部署脚本与 systemd 眼里读作「不健康」，
 * 那样防御本身就成了故障。</p>
 *
 * <p>缓存过期瞬间同时到达的两个请求可能都会跑一遍。这是可接受的：检查是只读且幂等的，加锁反而会
 * 让一个慢探针阻塞所有其他调用方。</p>
 */
@Component
public class HealthProbeRunner {

    private static final Logger log = LoggerFactory.getLogger(HealthProbeRunner.class);

    private static final Comparator<ComponentHealth> REPORT_ORDER =
            Comparator.comparingInt((ComponentHealth component) -> component.getType().ordinal())
                    .thenComparing(ComponentHealth::getName);

    private final List<HealthIndicator> indicators;

    private final List<HealthIndicator> criticalIndicators;

    private final ThreadPoolTaskExecutor healthProbeExecutor;

    private final long cacheTtlMs;

    private final long probeTimeoutMs;

    private final AtomicReference<HealthSnapshot> fullCache = new AtomicReference<>();

    private final AtomicReference<HealthSnapshot> criticalCache = new AtomicReference<>();

    public HealthProbeRunner(
            List<HealthIndicator> indicators,
            @Qualifier("healthProbeExecutor") ThreadPoolTaskExecutor healthProbeExecutor,
            @Value("${bgssai.health.cache-ttl-ms:2000}") long cacheTtlMs,
            @Value("${bgssai.health.probe-timeout-ms:2000}") long probeTimeoutMs) {
        this.indicators = indicators;
        this.criticalIndicators = indicators.stream().filter(HealthIndicator::critical).toList();
        this.healthProbeExecutor = healthProbeExecutor;
        this.cacheTtlMs = cacheTtlMs;
        this.probeTimeoutMs = probeTimeoutMs;
    }

    /** 全部组件，供全量报告使用。批次比 TTL 新时复用缓存。 */
    public HealthSnapshot snapshot() {
        return cached(fullCache, indicators);
    }

    /**
     * 仅 critical 组件，供就绪探针使用。
     *
     * <p>做成独立批次而不是对 {@link #snapshot()} 做过滤，是因为最坏情况的耗时：数据库不可达时每个
     * 依赖数据库的组件都会烧满单检查超时，全量报告可能要好几秒。部署脚本用
     * {@code curl --max-time 5} 探测，只跑 critical 组件能把就绪压在那个窗口内，于是一次失败的发布
     * 被报成一个干净的 503，而不是一次需要运维自己解读的探测超时。</p>
     */
    public HealthSnapshot criticalSnapshot() {
        return cached(criticalCache, criticalIndicators);
    }

    private HealthSnapshot cached(AtomicReference<HealthSnapshot> cache, List<HealthIndicator> targets) {
        long now = System.currentTimeMillis();
        HealthSnapshot hit = cache.get();
        if (hit != null && now - hit.getCheckedAtEpochMs() < cacheTtlMs) {
            return hit;
        }
        HealthSnapshot snapshot = new HealthSnapshot(now, runBatch(targets));
        cache.set(snapshot);
        return snapshot;
    }

    private List<ComponentHealth> runBatch(List<HealthIndicator> targets) {
        List<ComponentHealth> results = new ArrayList<>(targets.size());
        for (HealthIndicator indicator : targets) {
            long startNanos = System.nanoTime();
            ComponentHealth component;
            Future<ComponentHealth> future = null;
            try {
                future = healthProbeExecutor.submit(indicator::check);
                component = future.get(probeTimeoutMs, TimeUnit.MILLISECONDS);
                if (component == null) {
                    component = down(indicator, "indicator returned no result");
                }
            } catch (TimeoutException e) {
                future.cancel(true);
                log.warn("health indicator timed out component={} timeoutMs={}", indicator.name(), probeTimeoutMs);
                component = down(indicator, "check timed out");
            } catch (ExecutionException e) {
                Throwable cause = e.getCause() == null ? e : e.getCause();
                log.warn("health indicator threw component={} exception={} message={}",
                        indicator.name(), cause.getClass().getSimpleName(), cause.getMessage());
                component = down(indicator, HealthMessages.of(cause));
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                if (future != null) {
                    future.cancel(true);
                }
                log.warn("health indicator interrupted component={}", indicator.name());
                component = down(indicator, "check interrupted");
            } catch (RuntimeException e) {
                // 覆盖每条探针线程都卡在死依赖上时抛出的 RejectedExecutionException：
                // 该组件被报为 DOWN，而不是让整个端点失败。
                log.warn("health indicator not executed component={} exception={}",
                        indicator.name(), e.getClass().getSimpleName());
                component = down(indicator, HealthMessages.of(e));
            }
            component.setLatencyMs((System.nanoTime() - startNanos) / 1_000_000L);
            results.add(component);
        }
        results.sort(REPORT_ORDER);
        return results;
    }

    /**
     * 全部组件的整体状态（Standards §13.3 聚合规则）：任一 critical 组件 DOWN 直接判 DOWN；
     * 否则任一组件 DEGRADED 或任一非 critical 组件 DOWN 判 DEGRADED；否则 UP。
     */
    public static HealthStatus aggregate(List<ComponentHealth> components) {
        boolean degraded = false;
        for (ComponentHealth component : components) {
            if (component.getStatus() == HealthStatus.DOWN) {
                if (component.isCritical()) {
                    return HealthStatus.DOWN;
                }
                degraded = true;
            } else if (component.getStatus() == HealthStatus.DEGRADED) {
                degraded = true;
            }
        }
        return degraded ? HealthStatus.DEGRADED : HealthStatus.UP;
    }

    /**
     * 就绪结论：只看 critical 组件，这样磁盘偏紧或队列偏长永远不会让发布失败。
     */
    public static HealthStatus aggregateCritical(List<ComponentHealth> components) {
        boolean degraded = false;
        for (ComponentHealth component : components) {
            if (!component.isCritical()) {
                continue;
            }
            if (component.getStatus() == HealthStatus.DOWN) {
                return HealthStatus.DOWN;
            }
            if (component.getStatus() == HealthStatus.DEGRADED) {
                degraded = true;
            }
        }
        return degraded ? HealthStatus.DEGRADED : HealthStatus.UP;
    }

    private static ComponentHealth down(HealthIndicator indicator, String message) {
        return ComponentHealth.of(indicator.name(), indicator.type(), indicator.critical(),
                HealthStatus.DOWN, message, new LinkedHashMap<>());
    }

    /** 非 UP 的组件名，供各服务打那一行 WARN 用。 */
    public static List<String> unhealthyNames(List<ComponentHealth> components) {
        List<String> names = new ArrayList<>();
        for (ComponentHealth component : components) {
            if (component.getStatus() != HealthStatus.UP) {
                names.add(component.getName());
            }
        }
        return names;
    }
}
