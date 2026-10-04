package com.boruikang.health.admin.report.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.report.service.ReportService;
import com.boruikang.health.report.dto.*;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/reports")
@NeedAop
public class DeliverReportController {
    private final ReportService service;
    public DeliverReportController(ReportService service) { this.service=service; }
    @PostMapping("/delivery")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<ArchivedReportResponse> handle(@RequestBody @Valid DeliverReportRequest request) { return ApiResponse.ok(service.deliver(request)); }
}
