package com.boruikang.health.admin.plan.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.plan.service.EnrollmentService;
import com.boruikang.health.plan.dto.*;
import com.boruikang.health.common.Paged;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/enrollments")
@NeedAop
public class QueryEnrollmentsController {
    private final EnrollmentService service;
    public QueryEnrollmentsController(EnrollmentService service) { this.service=service; }
    @PostMapping("/query")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<Paged<EnrollmentResponse>> handle(@RequestBody @Valid EnrollmentQueryRequest request) { return ApiResponse.ok(service.query(request)); }
}
