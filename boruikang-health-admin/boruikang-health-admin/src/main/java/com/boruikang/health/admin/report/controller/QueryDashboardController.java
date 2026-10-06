package com.boruikang.health.admin.report.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.report.service.ReportService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin")
@NeedAop
public class QueryDashboardController {
    private final ReportService service;
    public QueryDashboardController(ReportService service) { this.service=service; }
    @GetMapping("/dashboard")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<com.boruikang.health.report.dto.DashboardResponse> handle() { return ApiResponse.ok(service.dashboard()); }
}
