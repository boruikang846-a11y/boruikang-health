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
public class QueryDailySummaryController {
    private final MetricService service;
    public QueryDailySummaryController(MetricService service) { this.service=service; }
    @PostMapping("/daily")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<DailySummaryResponse> handle(@RequestBody @Valid DailyQueryRequest request) { return ApiResponse.ok(service.daily(request)); }
}
