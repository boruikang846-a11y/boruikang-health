package com.bgssai.health.report.dto;
public record MetricDefinition(String code,String name,String numerator,String denominator,String exclusions,Double target,boolean lowerIsBetter) {}
