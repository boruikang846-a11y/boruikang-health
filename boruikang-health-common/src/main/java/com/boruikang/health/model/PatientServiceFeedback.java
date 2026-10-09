package com.boruikang.health.model;
import java.time.LocalDateTime;
public class PatientServiceFeedback extends BaseRow {
 public String patientReply;
 public Long repliedBy;
 public java.time.LocalDateTime repliedAt;
 public Long hospitalId;
 public Long entryId;
 public Long patientId;
 public Long journeyId;
 public Long caseId;
 public String requestId;
 public String kind;
 public String content;
 public String payloadHash;
}
