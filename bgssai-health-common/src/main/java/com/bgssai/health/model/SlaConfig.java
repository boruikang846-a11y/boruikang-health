package com.bgssai.health.model;
public class SlaConfig extends BaseRow {
    public Long hospitalId;
    public String riskLevel;
    public Integer firstContactHours;
    public Integer bookingDays;
    public Integer arrivalDays;
    public Integer lostAfterAttempts;
    public String note;
    public Integer version;
}
