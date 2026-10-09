package com.boruikang.health.model;
import java.time.LocalDate;
import java.time.LocalDateTime;
public class ContinuousCareReview extends BaseRow {
    public Long hospitalId;
    public Long patientId;
    public Long planId;
    public Integer revision;
    public String kind;
    public String summary;
    public String evidence;
    public String patientMessage;
    public String assessment;
    public Long journeyId;
    public Long actorId;
    public LocalDate nextReviewDate;
}
