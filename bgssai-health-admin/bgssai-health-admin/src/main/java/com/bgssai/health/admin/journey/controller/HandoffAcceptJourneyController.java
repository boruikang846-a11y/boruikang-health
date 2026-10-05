package com.bgssai.health.admin.journey.controller;
import com.bgssai.health.common.*;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.journey.dto.*;
import com.bgssai.health.journey.service.JourneyService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/journeys")
@NeedAop
public class HandoffAcceptJourneyController {
 private final JourneyService service;
 public HandoffAcceptJourneyController(JourneyService service){this.service=service;}
 @PostMapping("/handoff_accept")
 @RateLimit(capacity=120,refillPerMinute=120)
 public ApiResponse<JourneyResponse> handle(@RequestBody @Valid AcceptJourneyHandoffRequest req){return ApiResponse.ok(service.handoffAccept(req));}
}
