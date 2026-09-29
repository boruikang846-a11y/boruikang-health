package com.bgssai.health.admin.plan.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.plan.service.EnrollmentService;
import com.bgssai.health.plan.dto.*;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/enrollments")
@NeedAop
public class CreateEnrollmentController {
    private final EnrollmentService service;
    public CreateEnrollmentController(EnrollmentService service) { this.service=service; }
    @PostMapping("/create")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<EnrollmentResponse> handle(@RequestBody @Valid CreateEnrollmentRequest request) { return ApiResponse.ok(service.create(request)); }
}
