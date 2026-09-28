package com.bgssai.health.model;
import java.time.LocalDateTime;
public class KnowledgeEntry extends BaseRow {
    public Long hospitalId;
    public String kind;
    public String department;
    public String title;
    public String content;
    public String source;
    public Integer version;
    public String status;
    public Long reviewerId;
    public LocalDateTime reviewedAt;
    public String reviewChannel;
    public String reviewEvidence;
    public Integer serviceDays;
    public Integer followupCount;
}
