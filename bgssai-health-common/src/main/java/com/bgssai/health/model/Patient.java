package com.bgssai.health.model;
import java.time.LocalDateTime;
public class Patient extends BaseRow {
    public Long hospitalId;
    public Long accountId;
    public String name;
    public String gender;
    public Integer age;
    public String phone;
    public String department;
    public String disease;
    public String riskLevel;
    public String lifecycle;
    public Long doctorId;
    public Long ownerId;
    public Long channelId;
    public Long servicePackageId;
    public LocalDateTime consentAt;
    public String note;
    public Integer version;
}
