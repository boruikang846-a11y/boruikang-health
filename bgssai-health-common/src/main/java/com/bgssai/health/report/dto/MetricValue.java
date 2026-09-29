package com.bgssai.health.report.dto;
public record MetricValue(String code,String name,long numerator,Long denominator,Double rate,Double target,Boolean met,boolean lowerIsBetter) {}
