package com.boruikang.health.admin.doctor.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.report.service.DoctorWorkbenchService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/doctor")
@NeedAop
public class QueryDoctorWorkbenchController {
    private final DoctorWorkbenchService service;
    public QueryDoctorWorkbenchController(DoctorWorkbenchService service) { this.service=service; }
    @GetMapping("/workbench")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<com.boruikang.health.report.dto.DoctorWorkbenchResponse> handle() { return ApiResponse.ok(service.workbench()); }
}
