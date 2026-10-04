package com.boruikang.health.admin.plan.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.plan.service.PackageService;
import com.boruikang.health.plan.dto.*;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/packages")
@NeedAop
public class ChangePackageStatusController {
    private final PackageService service;
    public ChangePackageStatusController(PackageService service) { this.service=service; }
    @PostMapping("/status")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<PackageResponse> handle(@RequestBody @Valid ChangePackageStatusRequest request) { return ApiResponse.ok(service.changeStatus(request)); }
}
