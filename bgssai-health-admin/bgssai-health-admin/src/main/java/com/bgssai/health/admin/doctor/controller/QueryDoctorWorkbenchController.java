package com.bgssai.health.admin.doctor.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.report.service.DoctorWorkbenchService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/doctor")
@NeedAop
public class QueryDoctorWorkbenchController {
    private final DoctorWorkbenchService service;
    public QueryDoctorWorkbenchController(DoctorWorkbenchService service) { this.service=service; }
    @GetMapping("/workbench")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<com.bgssai.health.report.dto.DoctorWorkbenchResponse> handle() { return ApiResponse.ok(service.workbench()); }
}
