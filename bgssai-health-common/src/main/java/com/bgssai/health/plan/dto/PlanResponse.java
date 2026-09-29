package com.bgssai.health.plan.dto;
import java.util.List;
public record PlanResponse(Long id,String name,String disease,String entryScene,String description,String status,Integer version,List<PlanNodeDto> nodes) {}
