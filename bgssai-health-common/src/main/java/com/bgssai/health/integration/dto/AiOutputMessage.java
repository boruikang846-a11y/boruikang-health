package com.bgssai.health.integration.dto;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
@JsonIgnoreProperties(ignoreUnknown=true)
public record AiOutputMessage(String content) {}
