package com.bgssai.health.admin.plan.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.plan.service.PackageService;
import com.bgssai.health.plan.dto.*;
import com.bgssai.health.common.Paged;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/packages")
@NeedAop
public class QueryPackagesController {
    private final PackageService service;
    public QueryPackagesController(PackageService service) { this.service=service; }
    @PostMapping("/query")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<Paged<PackageResponse>> handle(@RequestBody @Valid PackageQueryRequest request) { return ApiResponse.ok(service.query(request)); }
}
