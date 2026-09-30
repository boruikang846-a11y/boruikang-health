package com.bgssai.health.admin.plan.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.plan.service.PlanService;
import com.bgssai.health.plan.dto.*;
import com.bgssai.health.common.Paged;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/plans")
@NeedAop
public class QueryPlansController {
    private final PlanService service;
    public QueryPlansController(PlanService service) { this.service=service; }
    @PostMapping("/query")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<Paged<PlanResponse>> handle(@RequestBody @Valid PlanQueryRequest request) { return ApiResponse.ok(service.query(request)); }
}
