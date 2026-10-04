package com.boruikang.health.template.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
public record MessageLogQueryRequest(@Min(0) Integer page,@Min(1) Integer size,@Positive Long patientId,@Positive Long taskId,@Pattern(regexp="SMS|WECHAT|PHONE_NOTE") String channel,LocalDate from,LocalDate to) {}
