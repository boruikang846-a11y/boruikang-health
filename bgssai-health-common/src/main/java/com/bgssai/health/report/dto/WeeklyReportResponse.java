package com.bgssai.health.report.dto;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
public record WeeklyReportResponse(LocalDate fromDate,LocalDate toDate,long patientCount,long dueCount,long completedCount,
    long onTimeCount,Double completionRate,Double onTimeRate,long alertCount,long closedAlertCount,Double alertCloseRate,
    long revisitCount,long arrivedCount,Double arrivalRate,List<DoctorMetric> doctors,LocalDateTime asOf,String deliveryStatus) {}
