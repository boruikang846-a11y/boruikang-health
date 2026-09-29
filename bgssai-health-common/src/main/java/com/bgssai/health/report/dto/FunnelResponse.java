package com.bgssai.health.report.dto;
import java.time.LocalDate;
import java.util.List;
public record FunnelResponse(LocalDate fromDate,LocalDate toDate,long screened,long highRisk,long enrolled,long invited,long reached,long willing,long booked,long arrived,long effectiveArrival,long packageActivated,long followupDone,long revisitDone,List<CampaignFunnel> campaigns) {}
