package com.boruikang.health.admin.plan.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.plan.service.PlanService;
import com.boruikang.health.plan.dto.*;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/plans")
@NeedAop
public class ChangePlanStatusController {
    private final PlanService service;
    public ChangePlanStatusController(PlanService service) { this.service=service; }
    @PostMapping("/status")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<PlanResponse> handle(@RequestBody @Valid ChangePlanStatusRequest request) { return ApiResponse.ok(service.changeStatus(request)); }
}
