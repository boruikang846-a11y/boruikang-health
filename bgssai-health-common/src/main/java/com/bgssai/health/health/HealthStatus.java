package com.bgssai.health.health;

/**
 * 单个组件与应用整体的健康状态（Standards §13.2）。
 *
 * <p>按名字序列化为 JSON：{@code "UP"} / {@code "DEGRADED"} / {@code "DOWN"}。这三个值是产品线
 * 统一契约的一部分，任何仓库都不得增删或改名（例如不得再出现 {@code WARN} / {@code DISABLED}），
 * 否则集中巡检平台 bgssai-healthcheck 无法按同一口径归一化各应用的自报状态。</p>
 */
public enum HealthStatus {

    /** 正常。 */
    UP,

    /** 可用但劣化，需要关注；永不阻断部署。 */
    DEGRADED,

    /** 不可用。critical 组件处于此状态时整体判定为未就绪。 */
    DOWN
}
