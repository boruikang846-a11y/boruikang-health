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
public class QueryArchivedReportsController {
    private final ReportService service;
    public QueryArchivedReportsController(ReportService service) { this.service=service; }
    @PostMapping("/archives/query")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<com.bgssai.health.common.Paged<ArchivedReportResponse>> handle(@RequestBody @Valid com.bgssai.health.common.dto.PageRequest request) { return ApiResponse.ok(service.archives(request)); }
}
