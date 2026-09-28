package com.bgssai.health.configuration;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/**
 * 全局异步线程池配置（Standards §4：严禁在业务代码里自行 new Thread / Executors，所有线程池在这里
 * 统筹声明并命名）。基于骨架新建产品时，本产品自己的异步池也加在这个类里，不要另起一处。
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    /**
     * 执行健康组件检查，使每次检查都能被赋予一个硬截止时间（Standards §13.5）。
     * <p>
     * 没有它探针可能永久挂住：Druid 的 {@code maxWait} 默认「无限等待」，数据库不可达时
     * {@code getConnection()} 永不返回，请求线程就此长驻。反复探测会一条条泄漏 Tomcat 线程，
     * 直到连存活端点都不再应答——健康检查自己成了故障。
     * <p>
     * 刻意做得很小：每个请求逐个提交检查，且 HealthProbeRunner 的 TTL 缓存已把批次频率压得很低。
     * 允许核心线程超时回收，空闲进程就不会常驻健康线程；关停时也不等待卡住的探针。
     */
    @Bean("healthProbeExecutor")
    public ThreadPoolTaskExecutor healthProbeExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(16);
        executor.setKeepAliveSeconds(60);
        executor.setAllowCoreThreadTimeOut(true);
        executor.setThreadNamePrefix("bgssai-health-probe-");
        executor.setWaitForTasksToCompleteOnShutdown(false);
        executor.setAwaitTerminationSeconds(5);
        executor.initialize();
        return executor;
    }
}
