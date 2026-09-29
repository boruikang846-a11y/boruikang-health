package com.bgssai.health.plan.dto;
public record PackageResponse(Long id,String code,String name,String disease,String tier,String scene,Integer periodDays,Integer priceCents,Integer followupCount,Integer assessmentCount,Integer reviewCount,
    String deviceNote,String privilegeNote,String serviceHours,String content,String redLines,Long planId,String planName,String status,Integer version,long activeEnrollments) {}
