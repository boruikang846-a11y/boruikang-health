package com.boruikang.health.admin.report.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.report.service.ReportService;
import com.boruikang.health.report.dto.WeeklyReportRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/reports")
@NeedAop
public class QueryWeeklyReportController {
    private final ReportService service;
    public QueryWeeklyReportController(ReportService service) { this.service=service; }
    @PostMapping("/weekly")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<com.boruikang.health.report.dto.WeeklyReportResponse> handle(@RequestBody @Valid WeeklyReportRequest request) { return ApiResponse.ok(service.weekly(request)); }
}
