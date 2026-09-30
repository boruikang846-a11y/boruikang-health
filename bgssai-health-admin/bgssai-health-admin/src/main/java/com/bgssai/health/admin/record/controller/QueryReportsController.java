package com.bgssai.health.admin.record.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.record.service.RecordService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/records")
@NeedAop
public class QueryReportsController {
    private final RecordService service;
    public QueryReportsController(RecordService service) { this.service=service; }
    @PostMapping("/reports")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<com.bgssai.health.common.Paged<com.bgssai.health.record.dto.ReportResponse>> handle(@RequestBody @Valid com.bgssai.health.record.dto.ReportQueryRequest request) { return ApiResponse.ok(service.reports(request)); }
}
