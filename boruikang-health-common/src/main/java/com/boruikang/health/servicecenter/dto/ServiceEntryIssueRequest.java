package com.boruikang.health.servicecenter.dto;
import jakarta.validation.constraints.*;
public record ServiceEntryIssueRequest(@NotNull @Positive Long contactId) {}
