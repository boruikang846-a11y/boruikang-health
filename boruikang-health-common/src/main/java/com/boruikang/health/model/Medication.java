package com.boruikang.health.model;
import java.time.LocalDate;
public class Medication extends BaseRow {
    public Long hospitalId;
    public Long patientId;
    public String drugName;
    public String dosage;
    public String frequency;
    public LocalDate startDate;
    public LocalDate endDate;
    public String status;
    public String source;
    public String adherence;
    public String note;
    public Integer version;
}
