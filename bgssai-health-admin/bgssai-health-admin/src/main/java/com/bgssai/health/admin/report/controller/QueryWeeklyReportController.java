package com.bgssai.health.admin.report.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.report.service.ReportService;
import com.bgssai.health.report.dto.WeeklyReportRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/reports")
@NeedAop
public class QueryWeeklyReportController {
    private final ReportService service;
    public QueryWeeklyReportController(ReportService service) { this.service=service; }
    @PostMapping("/weekly")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<com.bgssai.health.report.dto.WeeklyReportResponse> handle(@RequestBody @Valid WeeklyReportRequest request) { return ApiResponse.ok(service.weekly(request)); }
}
