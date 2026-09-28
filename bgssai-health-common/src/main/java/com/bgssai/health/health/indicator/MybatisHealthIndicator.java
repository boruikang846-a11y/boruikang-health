package com.bgssai.health.health.indicator;

import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.bgssai.health.health.HealthComponentType;
import com.bgssai.health.health.HealthMessages;
import com.bgssai.health.health.HealthStatus;
import com.bgssai.health.health.dto.ComponentHealth;
import com.bgssai.health.mapper.HealthAccountMapper;
import com.bgssai.health.model.HealthAccountExample;

/**
 * {@code mybatis} —— critical。对 {@code sys_user} 跑一次 Example 计数，把整条持久化链路端到端走一遍：
 * mapper 接口注册、Mapper XML 加载、SQL 执行与结果映射。一条可用的裸 JDBC 连接（{@code db} 组件）
 * 并不能证明其中任何一环。
 *
 * <p>只用 Generator 白名单方法 {@code countByExample}（Standards §2）；不写自定义 SQL、不新增表、
 * 不改 schema。行数为 0 报 {@code DEGRADED}——那意味着账号种子数据缺失，应用虽然活着但登录不了。</p>
 *
 * <p>各产品仓接入时把这里的表换成本产品最核心的那张配置表 / 账号表即可，组件名 {@code mybatis}
 * 与 critical 属性保持不变，仅 {@code metrics} 的键随表名走。</p>
 */
@Component
public class MybatisHealthIndicator implements HealthIndicator {

    private static final Logger log = LoggerFactory.getLogger(MybatisHealthIndicator.class);

    @Autowired
    private HealthAccountMapper sysUserMapper;

    @Override
    public String name() {
        return "mybatis";
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
        try {
            HealthAccountExample example = new HealthAccountExample();
            long rowCount = sysUserMapper.countByExample(example);
            metrics.put("sys_user_row_count", String.valueOf(rowCount));

            if (rowCount == 0L) {
                log.warn("health check mybatis sys_user empty");
                return ComponentHealth.of(name(), type(), critical(), HealthStatus.DEGRADED,
                        "sys_user seed rows missing", metrics);
            }
            return ComponentHealth.of(name(), type(), critical(), HealthStatus.UP,
                    "example count executed", metrics);
        } catch (Exception e) {
            log.warn("health check mybatis failed exception={} message={}",
                    e.getClass().getSimpleName(), e.getMessage());
            return ComponentHealth.of(name(), type(), critical(), HealthStatus.DOWN,
                    HealthMessages.of(e), metrics);
        }
    }
}
