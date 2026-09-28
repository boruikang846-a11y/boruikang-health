package com.bgssai.health.integration.dto;
import java.util.List;
public record AiRequest(String model,List<AiMessage> messages,int maxTokens,double temperature,boolean stream) {}
