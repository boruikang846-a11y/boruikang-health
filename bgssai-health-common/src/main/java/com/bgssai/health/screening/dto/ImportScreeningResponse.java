package com.bgssai.health.screening.dto;
import java.util.List;
public record ImportScreeningResponse(String importBatch,int created,int skipped,List<String> messages) {}
