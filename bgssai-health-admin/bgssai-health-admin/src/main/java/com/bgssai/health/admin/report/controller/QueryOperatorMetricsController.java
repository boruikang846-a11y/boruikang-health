package com.bgssai.health.admin.report.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.report.service.MetricService;
import com.bgssai.health.report.dto.*;
import java.util.List;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/reports")
@NeedAop
public class QueryOperatorMetricsController {
    private final MetricService service;
    public QueryOperatorMetricsController(MetricService service) { this.service=service; }
    @PostMapping("/operators")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<List<OperatorMetric>> handle(@RequestBody @Valid MetricQueryRequest request) { return ApiResponse.ok(service.operators(request)); }
}
