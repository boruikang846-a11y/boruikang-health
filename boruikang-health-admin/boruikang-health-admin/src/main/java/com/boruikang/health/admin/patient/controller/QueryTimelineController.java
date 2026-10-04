package com.boruikang.health.admin.patient.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.patient.service.TimelineService;
import com.boruikang.health.patient.dto.*;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/patients")
@NeedAop
public class QueryTimelineController {
    private final TimelineService service;
    public QueryTimelineController(TimelineService service) { this.service=service; }
    @PostMapping("/timeline")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<TimelineResponse> handle(@RequestBody @Valid TimelineQueryRequest request) { return ApiResponse.ok(service.timeline(request)); }
}
