package com.boruikang.health.org.dto;
public record SlaResponse(Long id,String riskLevel,Integer firstContactHours,Integer bookingDays,Integer arrivalDays,Integer lostAfterAttempts,String note,Integer version) {}
