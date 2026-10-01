package com.bgssai.health.integration.dto;

import java.time.LocalDateTime;
import java.util.List;

public record AiBalanceResponse(boolean isAvailable, List<AiBalanceInfo> balanceInfos, LocalDateTime checkedAt) {}
