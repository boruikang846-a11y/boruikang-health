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
public class QueryArchivedReportsController {
    private final ReportService service;
    public QueryArchivedReportsController(ReportService service) { this.service=service; }
    @PostMapping("/archives/query")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<com.boruikang.health.common.Paged<ArchivedReportResponse>> handle(@RequestBody @Valid com.boruikang.health.common.dto.PageRequest request) { return ApiResponse.ok(service.archives(request)); }
}
