package com.boruikang.health.admin.plan.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.plan.service.PlanService;
import com.boruikang.health.plan.dto.*;
import com.boruikang.health.common.Paged;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/plans")
@NeedAop
public class QueryPlansController {
    private final PlanService service;
    public QueryPlansController(PlanService service) { this.service=service; }
    @PostMapping("/query")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<Paged<PlanResponse>> handle(@RequestBody @Valid PlanQueryRequest request) { return ApiResponse.ok(service.query(request)); }
}
