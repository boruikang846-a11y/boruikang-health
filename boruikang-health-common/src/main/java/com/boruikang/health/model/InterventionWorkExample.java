package com.boruikang.health.model;
public class InterventionWorkExample extends ExampleBase {
 private Long scopedOwnerId,scopedDoctorId;
 public Long getScopedOwnerId(){return scopedOwnerId;} public void setScopedOwnerId(Long id){scopedOwnerId=id;}
 public Long getScopedDoctorId(){return scopedDoctorId;} public void setScopedDoctorId(Long id){scopedDoctorId=id;}

    public InterventionWorkExample() { super("hospital_id","patient_id","center","phase","category","title","content","clinical","record_id","due_at","status","approved_content","reviewer_id","acknowledged_by","result","first_response_at","arrived_at","arrival_evidence","score","feedback","version"); }
}
