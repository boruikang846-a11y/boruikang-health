package com.bgssai.health.admin.report.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.report.service.MetricService;
import com.bgssai.health.report.dto.*;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/reports")
@NeedAop
public class QueryWorkbenchController {
    private final MetricService service;
    public QueryWorkbenchController(MetricService service) { this.service=service; }
    @GetMapping("/workbench")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<WorkbenchResponse> handle() { return ApiResponse.ok(service.workbench()); }
}
