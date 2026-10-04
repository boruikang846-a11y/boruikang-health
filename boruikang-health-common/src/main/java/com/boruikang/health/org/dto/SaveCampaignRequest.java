package com.boruikang.health.org.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
public record SaveCampaignRequest(@Positive Long id,@Min(0) Integer version,@NotBlank @Size(max=120) String name,
    @NotBlank @Pattern(regexp="DAILY_INVITATION|EARLY_INTERVENTION|CLINIC_EVENT|SCREENING") String campaignType,
    @Positive Long orgId,@Size(max=200) String location,LocalDate startsOn,LocalDate endsOn,@Positive Long ownerId,
    @Pattern(regexp="PLANNED|ACTIVE|CLOSED") String status,@Min(0) Integer targetCount,@Size(max=600) String note) {}
