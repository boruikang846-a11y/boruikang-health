package com.bgssai.health.admin.plan.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.plan.service.EnrollmentService;
import com.bgssai.health.plan.dto.*;
import com.bgssai.health.common.Paged;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/enrollments")
@NeedAop
public class QueryEnrollmentsController {
    private final EnrollmentService service;
    public QueryEnrollmentsController(EnrollmentService service) { this.service=service; }
    @PostMapping("/query")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<Paged<EnrollmentResponse>> handle(@RequestBody @Valid EnrollmentQueryRequest request) { return ApiResponse.ok(service.query(request)); }
}
