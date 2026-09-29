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
public class TransitionEnrollmentController {
    private final EnrollmentService service;
    public TransitionEnrollmentController(EnrollmentService service) { this.service=service; }
    @PostMapping("/transition")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<EnrollmentResponse> handle(@RequestBody @Valid TransitionEnrollmentRequest request) { return ApiResponse.ok(service.transition(request)); }
}
