package com.bgssai.health.model;

/** Hospital contact for clinical review; this is not a login account. */
public class HospitalClinician extends BaseRow {
    public Long hospitalId;
    public String name;
    public String department;
    public Boolean active;
}
