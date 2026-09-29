package com.bgssai.health.admin.report.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.report.service.MetricService;
import com.bgssai.health.report.dto.*;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/reports")
@NeedAop
public class QueryFunnelController {
    private final MetricService service;
    public QueryFunnelController(MetricService service) { this.service=service; }
    @PostMapping("/funnel")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<FunnelResponse> handle(@RequestBody @Valid MetricQueryRequest request) { return ApiResponse.ok(service.funnel(request)); }
}
