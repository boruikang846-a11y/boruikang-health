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
public class NoRevisitJourneyController {
 private final JourneyService service;
 public NoRevisitJourneyController(JourneyService service){this.service=service;}
 @PostMapping("/no_revisit")
 @RateLimit(capacity=120,refillPerMinute=120)
 public ApiResponse<JourneyResponse> handle(@RequestBody @Valid NoJourneyRevisitRequest req){return ApiResponse.ok(service.noRevisit(req));}
}
