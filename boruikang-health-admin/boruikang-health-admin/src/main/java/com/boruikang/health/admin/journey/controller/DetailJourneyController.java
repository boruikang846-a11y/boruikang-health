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
public class DetailJourneyController {
 private final JourneyService service;
 public DetailJourneyController(JourneyService service){this.service=service;}
 @PostMapping("/detail")
 @RateLimit(capacity=120,refillPerMinute=120)
 public ApiResponse<JourneyResponse> handle(@RequestBody @Valid JourneyDetailRequest req){return ApiResponse.ok(service.detail(req));}
}
