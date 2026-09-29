package com.bgssai.health.admin.report.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.report.service.MetricService;
import com.bgssai.health.report.dto.*;
import java.util.List;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/reports")
@NeedAop
public class ListMetricDictionaryController {
    private final MetricService service;
    public ListMetricDictionaryController(MetricService service) { this.service=service; }
    @GetMapping("/metric-dictionary")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<List<MetricDefinition>> handle() { return ApiResponse.ok(service.dictionary()); }
}
