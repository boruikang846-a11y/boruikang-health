package com.boruikang.health.health.indicator;

import com.boruikang.health.health.HealthComponentType;
import com.boruikang.health.health.dto.ComponentHealth;

/**
 * 一个健康组件（Standards §13.2）。每个实现都是 Spring {@code @Component}；
 * {@code HealthProbeRunner} 把它们整体注入为一个 List，所以新增一个组件就是新增一个类，
 * 别处不需要任何 if-else 分发（Standards §7 策略隔离）。
 *
 * <p>这是各产品仓扩展本产品专属组件（redis / mqtt / object_storage / 支付商户 / 调度任务 …）的
 * 唯一入口：实现本接口即可，端点、缓存、超时隔离、排序、聚合规则全部复用，契约自动保持一致。</p>
 *
 * <p>实现必须是只读的：不写库、不开事务、不发起外部网络调用；同时必须廉价且有界——runner 会给
 * 每次检查加硬超时，但组件本身也不该指望靠超时兜底。</p>
 */
public interface HealthIndicator {

    /** 组件名，snake_case，属于对外契约的一部分。 */
    String name();

    HealthComponentType type();

    /** critical 组件决定就绪结论，进而决定部署是否回滚。 */
    boolean critical();

    /**
     * 执行检查。实现应当返回 {@code DOWN} / {@code DEGRADED} 结果而不是抛异常；即便抛了，runner
     * 也会捕获并把它隔离在该组件内（Standards §13.5）。{@code latency_ms} 由 runner 填写，实现不必管。
     */
    ComponentHealth check();
}
