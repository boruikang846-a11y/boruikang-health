package com.bgssai.health.org.dto;
import java.time.LocalDate;
public record CampaignResponse(Long id,String name,String campaignType,Long orgId,String location,LocalDate startsOn,LocalDate endsOn,
    Long ownerId,String status,Integer targetCount,String note,Integer version) {}
