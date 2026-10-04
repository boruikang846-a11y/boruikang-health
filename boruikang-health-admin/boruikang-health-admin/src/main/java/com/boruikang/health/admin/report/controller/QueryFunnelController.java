package com.boruikang.health.admin.report.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.report.service.MetricService;
import com.boruikang.health.report.dto.*;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/reports")
@NeedAop
public class QueryFunnelController {
    private final MetricService service;
    public QueryFunnelController(MetricService service) { this.service=service; }
    @PostMapping("/funnel")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<FunnelResponse> handle(@RequestBody @Valid MetricQueryRequest request) { return ApiResponse.ok(service.funnel(request)); }
}
