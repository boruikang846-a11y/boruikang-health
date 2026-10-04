package com.boruikang.health.admin.report.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.report.service.MetricService;
import com.boruikang.health.report.dto.*;
import java.util.List;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/reports")
@NeedAop
public class QueryOperatorMetricsController {
    private final MetricService service;
    public QueryOperatorMetricsController(MetricService service) { this.service=service; }
    @PostMapping("/operators")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<List<OperatorMetric>> handle(@RequestBody @Valid MetricQueryRequest request) { return ApiResponse.ok(service.operators(request)); }
}
