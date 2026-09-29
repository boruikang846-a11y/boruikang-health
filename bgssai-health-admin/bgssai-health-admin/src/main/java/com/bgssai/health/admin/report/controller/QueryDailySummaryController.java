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
public class QueryDailySummaryController {
    private final MetricService service;
    public QueryDailySummaryController(MetricService service) { this.service=service; }
    @PostMapping("/daily")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<DailySummaryResponse> handle(@RequestBody @Valid DailyQueryRequest request) { return ApiResponse.ok(service.daily(request)); }
}
