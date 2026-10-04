package com.boruikang.health.health;

/**
 * 构造组件检查失败时的 {@code message}。
 *
 * <p>健康端点是公开端点（Standards §13.4），响应体等同于公开内容，因此只暴露异常的**类型名**，
 * 绝不回显异常原文、更不回显堆栈。JDBC 异常文案里常常内嵌连接串、主机与端口，直接回显等于把
 * Standards §6.1.6 明令不得入日志的凭据信息搬到了公网。完整信息留在 indicator 自己写的那行服务端
 * 日志里（Standards §6.1.5：一行无栈 WARN；堆栈仍由全局异常处理器负责）。</p>
 */
public final class HealthMessages {

    private HealthMessages() {
        throw new IllegalStateException("Utility class");
    }

    public static String of(Throwable throwable) {
        if (throwable == null) {
            return "unknown error";
        }
        return throwable.getClass().getSimpleName();
    }
}
