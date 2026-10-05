package com.boruikang.health.model;
import java.time.LocalDateTime;
public class Referral extends BaseRow {
    public Long hospitalId;
    public Long patientId;
    public String direction;
    public String referralType;
    public Long fromOrgId;
    public Long toOrgId;
    public String reason;
    public String riskLevel;
    public LocalDateTime initiatedAt;
    public LocalDateTime slaDueAt;
    public String status;
    public LocalDateTime acceptedAt;
    public LocalDateTime arrivedAt;
    public String feedbackDepartment;
    public Long feedbackClinicianId;
    public String feedbackDiagnosis;
    public String feedbackDisposition;
    public LocalDateTime feedbackAt;
    public String evidence;
    public Long actorId;
    public String requestKey;
    public Integer version;
}
