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
public class QueryJourneyController {
 private final JourneyService service;
 public QueryJourneyController(JourneyService service){this.service=service;}
 @PostMapping("/query")
 @RateLimit(capacity=120,refillPerMinute=120)
 public ApiResponse<Paged<JourneyResponse>> handle(@RequestBody @Valid JourneyQueryRequest req){return ApiResponse.ok(service.query(req));}
}
