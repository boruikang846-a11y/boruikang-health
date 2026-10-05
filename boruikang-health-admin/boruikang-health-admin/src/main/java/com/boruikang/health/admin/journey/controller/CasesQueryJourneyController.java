package com.boruikang.health.admin.journey.controller;
import com.boruikang.health.common.*;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.journey.dto.*;
import com.boruikang.health.journey.service.JourneyService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController @NeedAop @RequestMapping("/boruikang/admin/journeys")
public class CasesQueryJourneyController {
 private final JourneyService service;
 public CasesQueryJourneyController(JourneyService service){this.service=service;}
 @PostMapping("/cases_query") @RateLimit(capacity=120,refillPerMinute=120)
 public ApiResponse<Paged<JourneyCaseResponse>> handle(@RequestBody @Valid JourneyCaseQueryRequest req){return ApiResponse.ok(service.casesQuery(req));}
}
