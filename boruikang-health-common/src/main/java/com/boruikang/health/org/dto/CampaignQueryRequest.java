package com.boruikang.health.org.dto;
import jakarta.validation.constraints.*;
public record CampaignQueryRequest(@Min(0) Integer page,@Min(1) Integer size,@Size(max=16) String status,@Size(max=24) String campaignType) {}
