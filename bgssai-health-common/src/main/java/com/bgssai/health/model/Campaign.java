package com.bgssai.health.model;
import java.time.LocalDate;
public class Campaign extends BaseRow {
    public Long hospitalId;
    public String name;
    public String campaignType;
    public Long orgId;
    public String location;
    public LocalDate startsOn;
    public LocalDate endsOn;
    public Long ownerId;
    public String status;
    public Integer targetCount;
    public String note;
    public Integer version;
}
