package com.bgssai.health.admin.plan.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.plan.service.PlanService;
import com.bgssai.health.plan.dto.*;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/plans")
@NeedAop
public class SavePlanController {
    private final PlanService service;
    public SavePlanController(PlanService service) { this.service=service; }
    @PostMapping("/save")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<PlanResponse> handle(@RequestBody @Valid SavePlanRequest request) { return ApiResponse.ok(service.save(request)); }
}
