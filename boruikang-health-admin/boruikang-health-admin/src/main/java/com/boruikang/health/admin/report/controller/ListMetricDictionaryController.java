package com.boruikang.health.admin.report.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.report.service.MetricService;
import com.boruikang.health.report.dto.*;
import java.util.List;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/reports")
@NeedAop
public class ListMetricDictionaryController {
    private final MetricService service;
    public ListMetricDictionaryController(MetricService service) { this.service=service; }
    @GetMapping("/metric-dictionary")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<List<MetricDefinition>> handle() { return ApiResponse.ok(service.dictionary()); }
}
