package com.bgssai.health.admin.report.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.report.service.ReportService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin")
@NeedAop
public class QueryDashboardController {
    private final ReportService service;
    public QueryDashboardController(ReportService service) { this.service=service; }
    @GetMapping("/dashboard")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<com.bgssai.health.report.dto.DashboardResponse> handle() { return ApiResponse.ok(service.dashboard()); }
}
