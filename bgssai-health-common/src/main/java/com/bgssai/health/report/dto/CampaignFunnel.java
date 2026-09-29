package com.bgssai.health.report.dto;
public record CampaignFunnel(Long campaignId,String name,String status,Integer targetCount,long screened,long highRisk,long enrolled,long invited,long reached,long willing,long booked,long arrived) {}
