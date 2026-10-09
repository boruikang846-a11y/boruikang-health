package com.boruikang.health.model;
import java.time.LocalDateTime;
public class PatientServiceEntry extends BaseRow {
 public String serviceConsentKey;
 public Long hospitalId;
 public Long contactId;
 public String tokenHash;
 public String status;
 public String patientName;
 public String phone;
 public String relation;
 public String entryPhase;
 public String consentVersion;
 public LocalDateTime consentAt;
 public String identityEvidence;
 public Long patientId;
 public LocalDateTime expiresAt;
 public Integer version;
}
