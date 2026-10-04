package com.boruikang.health.hospital.dto;
import java.util.List;
public record HospitalPatientResponse(String hospitalPatientId,String name,String gender,Integer age,String phone,
    String department,String disease,List<HospitalRecordResponse> records) {}
