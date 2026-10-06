package com.boruikang.health.model;
import java.time.LocalDateTime;
public class ContactAttempt extends BaseRow {
    public Long hospitalId;
    public Long patientId;
    public Long taskId;
    public Long actorId;
    public LocalDateTime contactAt;
    public String method;
    public String result;
    public Boolean identityVerified;
    public Boolean reportReviewed;
    public String recipientRole;
    public String reason;
    public LocalDateTime nextContactAt;
    public String nextPlan;
    public String medicationFeedback;
    public String patientQuestions;
    public String evidence;
    public Integer satisfaction;
    public String complaint;
    public String requestKey;
}
