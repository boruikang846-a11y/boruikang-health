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
public class QueryJourneyController {
 private final JourneyService service;
 public QueryJourneyController(JourneyService service){this.service=service;}
 @PostMapping("/query")
 @RateLimit(capacity=120,refillPerMinute=120)
 public ApiResponse<Paged<JourneyResponse>> handle(@RequestBody @Valid JourneyQueryRequest req){return ApiResponse.ok(service.query(req));}
}
