package com.bgssai.health.hospital.dto;
import java.util.List;
public record HospitalBatchResponse(String sourceSystem,String scenario,List<HospitalPatientResponse> patients) {}
