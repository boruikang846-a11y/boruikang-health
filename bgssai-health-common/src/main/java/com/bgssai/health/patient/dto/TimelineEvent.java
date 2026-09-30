package com.bgssai.health.patient.dto;
import java.time.LocalDateTime;
/** One merged patient-timeline entry; kind is the source table, refId the row id inside it. */
public record TimelineEvent(String kind,LocalDateTime at,String title,String detail,Long refId,String status) {}
