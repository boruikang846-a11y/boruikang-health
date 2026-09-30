package com.bgssai.health.health.indicator;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.LinkedHashMap;
import java.util.Map;

import javax.sql.DataSource;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.alibaba.druid.pool.DruidDataSource;
import com.bgssai.health.health.HealthComponentType;
import com.bgssai.health.health.HealthMessages;
import com.bgssai.health.health.HealthStatus;
import com.bgssai.health.health.dto.ComponentHealth;

/**
 * {@code db} —— critical。从连接池借一条连接并在有界超时内校验它。
 *
 * <p>刻意不读任何元数据：JDBC URL、主机、账号乃至数据库产品与版本都不进响应，因为这些端点是公开的
 * （Standards §13.4）。唯一暴露的指标是本次施加的超时值。</p>
 */
@Component
public class DatabaseHealthIndicator implements HealthIndicator {

    private static final Logger log = LoggerFactory.getLogger(DatabaseHealthIndicator.class);

    private final DataSource dataSource;

    private final int validationTimeoutSeconds;

    public DatabaseHealthIndicator(
            DataSource dataSource,
            @Value("${bgssai.health.db-validation-timeout-seconds:2}") int validationTimeoutSeconds) {
        this.dataSource = dataSource;
        this.validationTimeoutSeconds = Math.max(1, validationTimeoutSeconds);
    }

    @Override
    public String name() {
        return "db";
    }

    @Override
    public HealthComponentType type() {
        return HealthComponentType.DATABASE;
    }

    @Override
    public boolean critical() {
        return true;
    }

    @Override
    public ComponentHealth check() {
        Map<String, String> metrics = new LinkedHashMap<>();
        metrics.put("validation_timeout_seconds", String.valueOf(validationTimeoutSeconds));

        try (Connection connection = borrowConnection()) {
            if (!connection.isValid(validationTimeoutSeconds)) {
                log.warn("health check db connection invalid timeoutSeconds={}", validationTimeoutSeconds);
                return ComponentHealth.of(name(), type(), critical(), HealthStatus.DOWN,
                        "connection validation failed", metrics);
            }
            return ComponentHealth.of(name(), type(), critical(), HealthStatus.UP,
                    "connection validated", metrics);
        } catch (Exception e) {
            log.warn("health check db unavailable exception={} message={}",
                    e.getClass().getSimpleName(), e.getMessage());
            return ComponentHealth.of(name(), type(), critical(), HealthStatus.DOWN,
                    HealthMessages.of(e), metrics);
        }
    }

    /**
     * 在连接池支持的前提下带显式截止时间地借连接。
     *
     * <p>Druid 的 {@code maxWait} 默认是「无限等待」，数据库不可达时裸调 {@code getConnection()}
     * 永不返回，探针会挂住而不是报 DOWN。Druid 的重载版按毫秒接收等待上限，超时抛
     * {@code GetConnectionTimeoutException}（属 SQLException），由上面的 catch 转成 DOWN 结果。
     * 其它连接池实现回退到裸调。</p>
     *
     * <p>runner 的单检查硬超时本来也能兜住这次挂起，但那依赖中断探针线程；在这里给借连接加界能让
     * 等待自己结束，即使连接池哪天不再响应中断也能释放探针线程。</p>
     */
    private Connection borrowConnection() throws SQLException {
        if (dataSource instanceof DruidDataSource druid) {
            return druid.getConnection(validationTimeoutSeconds * 1000L);
        }
        return dataSource.getConnection();
    }
}
