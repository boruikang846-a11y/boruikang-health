package com.bgssai.health.admin.plan.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.plan.service.PackageService;
import com.bgssai.health.plan.dto.*;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/packages")
@NeedAop
public class ChangePackageStatusController {
    private final PackageService service;
    public ChangePackageStatusController(PackageService service) { this.service=service; }
    @PostMapping("/status")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<PackageResponse> handle(@RequestBody @Valid ChangePackageStatusRequest request) { return ApiResponse.ok(service.changeStatus(request)); }
}
