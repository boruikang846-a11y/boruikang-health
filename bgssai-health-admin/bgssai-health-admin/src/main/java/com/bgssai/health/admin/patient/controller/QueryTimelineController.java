package com.bgssai.health.admin.patient.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.patient.service.TimelineService;
import com.bgssai.health.patient.dto.*;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/patients")
@NeedAop
public class QueryTimelineController {
    private final TimelineService service;
    public QueryTimelineController(TimelineService service) { this.service=service; }
    @PostMapping("/timeline")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<TimelineResponse> handle(@RequestBody @Valid TimelineQueryRequest request) { return ApiResponse.ok(service.timeline(request)); }
}
