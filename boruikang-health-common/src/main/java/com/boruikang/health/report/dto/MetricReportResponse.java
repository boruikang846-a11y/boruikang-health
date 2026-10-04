package com.boruikang.health.report.dto;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
public record MetricReportResponse(LocalDate fromDate,LocalDate toDate,List<MetricValue> metrics,String dictionaryVersion,LocalDateTime asOf) {}
