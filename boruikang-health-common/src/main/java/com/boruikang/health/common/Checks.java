package com.boruikang.health.common;
import com.boruikang.health.common.exception.BizException;
import java.util.Set;
public final class Checks {
    private Checks() {}
    public static void require(boolean condition, String message) { if (!condition) throw new BizException("50000001", message); }
    public static void permit(boolean condition) { if (!condition) throw new BizException("4003", "No permission / 无权执行此操作"); }
    public static void found(boolean condition) { if (!condition) throw new BizException("404000", "Record not found / 记录不存在或不可见"); }
    public static void conflict(boolean condition) { if (!condition) throw new BizException("409000", "Record changed / 状态已变更，请刷新后重试"); }
    public static void oneOf(String value, String... allowed) { require(value != null && Set.of(allowed).contains(value), "Invalid value / 不支持的字段值"); }
    public static boolean text(String value) { return value != null && !value.isBlank(); }
}
