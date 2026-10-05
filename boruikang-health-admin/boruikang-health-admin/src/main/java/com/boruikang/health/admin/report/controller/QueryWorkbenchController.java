package com.boruikang.health.admin.report.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.report.service.MetricService;
import com.boruikang.health.report.dto.*;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/reports")
@NeedAop
public class QueryWorkbenchController {
    private final MetricService service;
    public QueryWorkbenchController(MetricService service) { this.service=service; }
    @GetMapping("/workbench")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<WorkbenchResponse> handle() { return ApiResponse.ok(service.workbench()); }
}
