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
public class CreateJourneyController {
 private final JourneyService service;
 public CreateJourneyController(JourneyService service){this.service=service;}
 @PostMapping("/create")
 @RateLimit(capacity=120,refillPerMinute=120)
 public ApiResponse<JourneyResponse> handle(@RequestBody @Valid CreateJourneyRequest req){return ApiResponse.ok(service.create(req));}
}
