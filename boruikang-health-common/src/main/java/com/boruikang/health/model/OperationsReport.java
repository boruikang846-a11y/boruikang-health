package com.boruikang.health.model;
import java.time.LocalDate;
import java.time.LocalDateTime;
public class OperationsReport extends BaseRow {
    public Long hospitalId;
    public Long ownerId;
    public String reportType;
    public LocalDate fromDate;
    public LocalDate toDate;
    public String summary;
    public String actionPlan;
    public String snapshotJson;
    public String deliveryEvidence;
    public LocalDateTime deliveredAt;
    public Integer version;
}
