package com.bgssai.health.admin.journey.controller;
import com.bgssai.health.common.*;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.journey.dto.*;
import com.bgssai.health.journey.service.JourneyService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController @NeedAop @RequestMapping("/bgssai/admin/journeys")
public class SummaryJourneyController {
 private final JourneyService service;
 public SummaryJourneyController(JourneyService service){this.service=service;}
 @PostMapping("/summary") @RateLimit(capacity=120,refillPerMinute=120)
 public ApiResponse<JourneySummaryResponse> handle(@RequestBody @Valid JourneySummaryRequest req){return ApiResponse.ok(service.summary(req));}
}
