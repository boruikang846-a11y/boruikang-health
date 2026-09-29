package com.bgssai.health.report.dto;
import java.time.LocalDate;
public record DailySummaryResponse(LocalDate date,long newScreenings,long newPatients,long invitations,long reached,long appointmentsBooked,long arrived,long followupsDue,long followupsDone,long alertsOpened,long alertsClosed,long messagesLogged,long enrollmentsActivated,long overdueOpen) {}
