package com.bgssai.health.integration.dto;
public record IntegrationResponse(String provider,String endpoint,String modelName,boolean enabled,boolean configured,String status) {}
