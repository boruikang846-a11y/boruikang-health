package com.boruikang.health.intervention.dto;
import com.boruikang.health.common.Paged;
import java.util.Map;
public record InterventionQueryResponse(Paged<InterventionResponse> page,Map<String,Long> metrics) {}
