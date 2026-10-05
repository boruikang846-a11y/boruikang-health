package com.boruikang.health.journey.dto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
import java.util.List;
import com.boruikang.health.plan.dto.PlanNodeDto;
public record JourneyQueryRequest(@Min(0) Integer page,@Min(1) Integer size,@Positive Long patientId,@Pattern(regexp="OUTPATIENT|DISCHARGE") String kind,@Pattern(regexp="INTAKE|ACTIVE|PAUSED|EXITED|CLOSED") String status) {}
