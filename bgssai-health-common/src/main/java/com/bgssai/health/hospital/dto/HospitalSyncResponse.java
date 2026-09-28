package com.bgssai.health.hospital.dto;
import java.util.List;
public record HospitalSyncResponse(String sourceSystem,int createdPatients,int existingPatients,int createdRecords,
    int skippedRecords,List<Long> patientIds) {}
