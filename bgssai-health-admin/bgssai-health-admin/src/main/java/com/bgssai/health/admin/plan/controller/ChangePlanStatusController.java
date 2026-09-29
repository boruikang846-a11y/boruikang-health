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
public class ChangePlanStatusController {
    private final PlanService service;
    public ChangePlanStatusController(PlanService service) { this.service=service; }
    @PostMapping("/status")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<PlanResponse> handle(@RequestBody @Valid ChangePlanStatusRequest request) { return ApiResponse.ok(service.changeStatus(request)); }
}
