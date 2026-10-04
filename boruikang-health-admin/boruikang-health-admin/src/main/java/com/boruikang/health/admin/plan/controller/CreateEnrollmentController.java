package com.boruikang.health.admin.plan.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.plan.service.EnrollmentService;
import com.boruikang.health.plan.dto.*;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/enrollments")
@NeedAop
public class CreateEnrollmentController {
    private final EnrollmentService service;
    public CreateEnrollmentController(EnrollmentService service) { this.service=service; }
    @PostMapping("/create")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<EnrollmentResponse> handle(@RequestBody @Valid CreateEnrollmentRequest request) { return ApiResponse.ok(service.create(request)); }
}
