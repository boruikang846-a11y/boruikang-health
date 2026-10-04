package com.boruikang.health.health;

/**
 * 健康组件的分类（Standards §13.2）。声明顺序即报告排序：组件先按本枚举的 ordinal 排，再按组件名
 * 字典序排，使同一应用两次调用、不同应用之间的组件顺序都稳定可比。
 */
public enum HealthComponentType {

    /** 数据库与持久层。 */
    DATABASE,

    /** 中间件：连接池、异步线程池、调度器、缓存、消息队列。 */
    MIDDLEWARE,

    /** 进程运行时资源：堆内存、磁盘空间。 */
    RUNTIME,

    /** 业务外部依赖的本地就绪度（对象存储、短信、支付商户配置等）。 */
    EXTERNAL
}
