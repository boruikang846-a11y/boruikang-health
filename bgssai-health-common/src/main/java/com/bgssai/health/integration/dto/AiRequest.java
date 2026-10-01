package com.bgssai.health.integration.dto;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;
@JsonInclude(JsonInclude.Include.NON_NULL)
public record AiRequest(String model,List<AiMessage> messages,AiThinking thinking,int maxTokens,double temperature,boolean stream) {}
