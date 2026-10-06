package com.boruikang.health.report.dto;
import java.time.LocalDateTime;
import java.util.List;
public record WorkbenchResponse(LocalDateTime asOf,List<QueueItem> queues) {}
