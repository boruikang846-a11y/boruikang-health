package com.boruikang.health.model;
import java.time.LocalDateTime;
public class InterventionWork extends BaseRow {
    public Long hospitalId;
    public Long patientId;
    public String center;
    public String phase;
    public String category;
    public String title;
    public String content;
    public Boolean clinical;
    public Long recordId;
    public LocalDateTime dueAt;
    public String status;
    public String approvedContent;
    public Long reviewerId;
    public Long acknowledgedBy;
    public String result;
    public LocalDateTime firstResponseAt;
    public LocalDateTime arrivedAt;
    public String arrivalEvidence;
    public Integer score;
    public String feedback;
    public Integer version;
}
