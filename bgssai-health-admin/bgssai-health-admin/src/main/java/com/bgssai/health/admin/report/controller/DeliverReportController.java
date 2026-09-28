package com.bgssai.health.admin.report.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.report.service.ReportService;
import com.bgssai.health.report.dto.*;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/reports")
@NeedAop
public class DeliverReportController {
    private final ReportService service;
    public DeliverReportController(ReportService service) { this.service=service; }
    @PostMapping("/delivery")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<ArchivedReportResponse> handle(@RequestBody @Valid DeliverReportRequest request) { return ApiResponse.ok(service.deliver(request)); }
}
