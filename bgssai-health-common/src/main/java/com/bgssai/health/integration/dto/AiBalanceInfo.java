package com.bgssai.health.integration.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown=true)
public record AiBalanceInfo(String currency, String totalBalance, String grantedBalance, String toppedUpBalance) {}
