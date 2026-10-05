package com.bgssai.health.model;
import java.time.LocalDateTime;
public class ServiceJourney extends BaseRow {
    public Long hospitalId;
    public Long patientId;
    public String kind;
    public String entryPhase;
    public String sourceSystem;
    public String eventKey;
    public LocalDateTime eventAt;
    public String status;
    public Integer stage;
    public Long ownerId;
    public Long doctorId;
    public Long currentPlanId;
    public Long arrivalId;
    public Long recordId;
    public String recordSnapshot;
    public String identityEvidence;
    public String handoffEvidence;
    public Boolean noRevisit;
    public Long noRevisitBy;
    public String noRevisitReason;
    public Integer version;
}
