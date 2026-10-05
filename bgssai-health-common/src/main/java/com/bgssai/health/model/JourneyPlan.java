package com.bgssai.health.model;
import java.time.LocalDateTime;
public class JourneyPlan extends BaseRow {
    public Long hospitalId;
    public Long patientId;
    public Long journeyId;
    public Integer revision;
    public String status;
    public Long reportId;
    public String reportSnapshot;
    public String planText;
    public String nodesJson;
    public Long templateId;
    public Integer templateVersion;
    public Long reviewerId;
    public LocalDateTime reviewedAt;
    public String reviewNote;
    public LocalDateTime baselineAt;
}
