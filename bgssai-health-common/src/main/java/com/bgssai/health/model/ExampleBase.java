package com.bgssai.health.model;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/** Hand-maintained single-table Example. All SQL identifiers/operators come from allowlists. */
public abstract class ExampleBase {
    private final Set<String> allowedColumns;
    private final List<Criterion> criteria = new ArrayList<>();
    private List<String> selectedColumns = List.of();
    private String orderByClause = "id DESC";
    private boolean forUpdate;

    protected ExampleBase(String... columns) {
        allowedColumns = new HashSet<>(Arrays.asList(columns));
        allowedColumns.addAll(List.of("id", "del_flag", "creator", "modifier", "gmt_create", "gmt_modified"));
        eq("del_flag", false);
    }
    public ExampleBase eq(String column, Object value) { return add(column, "=", value); }
    public ExampleBase ne(String column, Object value) { return add(column, "<>", value); }
    public ExampleBase ge(String column, Object value) { return add(column, ">=", value); }
    public ExampleBase lt(String column, Object value) { return add(column, "<", value); }
    public ExampleBase le(String column, Object value) { return add(column, "<=", value); }
    public ExampleBase gt(String column, Object value) { return add(column, ">", value); }
    public ExampleBase isNull(String column) { criteria.add(new Criterion(check(column), "IS NULL", null, false, null)); return this; }
    public ExampleBase isNotNull(String column) { criteria.add(new Criterion(check(column), "IS NOT NULL", null, false, null)); return this; }
    public ExampleBase like(String column, String value) { return add(column, "LIKE", value); }
    public ExampleBase in(String column, List<?> values) {
        if (values == null || values.isEmpty()) return eq("id", -1L);
        criteria.add(new Criterion(check(column), "IN", List.copyOf(values), true, null));
        return this;
    }
    public ExampleBase leColumn(String left, String right) {
        criteria.add(new Criterion(check(left), "<=", null, false, check(right))); return this;
    }
    private ExampleBase add(String column, String operator, Object value) {
        if (value == null) throw new IllegalArgumentException("Example values must not be null");
        criteria.add(new Criterion(check(column), operator, value, false, null)); return this;
    }
    public void selectColumns(String... columns) { selectedColumns = Arrays.stream(columns).map(this::check).toList(); }
    public void setOrderByClause(String order) {
        for (String item : order.split(",")) {
            String[] parts = item.trim().split("\\s+");
            if (parts.length != 2 || !Set.of("ASC", "DESC").contains(parts[1])) throw new IllegalArgumentException("Invalid order");
            check(parts[0]);
        }
        orderByClause = order;
    }
    private String check(String column) {
        if (!allowedColumns.contains(column)) throw new IllegalArgumentException("Unknown column");
        return column;
    }
    public List<Criterion> getCriteria() { return List.copyOf(criteria); }
    public List<String> getSelectedColumns() { return selectedColumns; }
    public String getOrderByClause() { return orderByClause; }
    public boolean getForUpdate() { return forUpdate; }
    public void setForUpdate(boolean value) { forUpdate = value; }
    public record Criterion(String column, String operator, Object value, boolean list, String comparedColumn) {}
}
