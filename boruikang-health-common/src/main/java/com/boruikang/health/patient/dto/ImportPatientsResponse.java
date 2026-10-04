package com.boruikang.health.patient.dto;
import java.util.List;
public record ImportPatientsResponse(String importBatch,int created,int skipped,List<String> messages) {}
