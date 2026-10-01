package com.bgssai.health.integration.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown=true)
public record DeepseekBalanceResponse(Boolean isAvailable, List<AiBalanceInfo> balanceInfos) {}
