package com.boruikang.health.patient.dto;
/** A doctor account as shown in pickers; inactive doctors stay listed for historical names. */
public record ClinicianInfo(Long id, String name, String department, Boolean active) {}
