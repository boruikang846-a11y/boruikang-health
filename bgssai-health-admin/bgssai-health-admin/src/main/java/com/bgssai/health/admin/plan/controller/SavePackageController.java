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
public class SavePackageController {
    private final PackageService service;
    public SavePackageController(PackageService service) { this.service=service; }
    @PostMapping("/save")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<PackageResponse> handle(@RequestBody @Valid SavePackageRequest request) { return ApiResponse.ok(service.save(request)); }
}
