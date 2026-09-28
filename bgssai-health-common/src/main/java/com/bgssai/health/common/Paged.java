package com.bgssai.health.common;
import com.github.pagehelper.Page;
import java.util.List;
import java.util.function.Function;
public record Paged<T>(List<T> items, int pageNum, int pageSize, long totalSize) {
    public static int size(Integer size) { return Math.min(100, Math.max(1, size == null ? 20 : size)); }
    public static int number(Integer page) { Checks.require(page == null || (page >= 0 && page <= 100000), "Invalid page"); return page == null ? 1 : page + 1; }
    public static <S,T> Paged<T> of(List<S> rows, Function<S,T> convert) {
        Page<S> page = (Page<S>) rows;
        return new Paged<>(rows.stream().map(convert).toList(), page.getPageNum(), page.getPageSize(), page.getTotal());
    }
}
