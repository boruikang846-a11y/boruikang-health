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
public class ArchiveReportController {
    private final ReportService service;
    public ArchiveReportController(ReportService service) { this.service=service; }
    @PostMapping("/archive")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<ArchivedReportResponse> handle(@RequestBody @Valid ArchiveReportRequest request) { return ApiResponse.ok(service.archive(request)); }
}
