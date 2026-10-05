package com.boruikang.health.admin.journey.controller;
import com.boruikang.health.common.*;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.journey.dto.*;
import com.boruikang.health.journey.service.JourneyService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/journeys")
@NeedAop
public class PlanDraftJourneyController {
 private final JourneyService service;
 public PlanDraftJourneyController(JourneyService service){this.service=service;}
 @PostMapping("/plan_draft")
 @RateLimit(capacity=120,refillPerMinute=120)
 public ApiResponse<JourneyResponse> handle(@RequestBody @Valid DraftJourneyPlanRequest req){return ApiResponse.ok(service.planDraft(req));}
}
