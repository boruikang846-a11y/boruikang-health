package com.boruikang.health.admin.patient.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.patient.dto.PatientSummaryResponse;
import com.boruikang.health.patient.service.PatientService;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/patients")
@NeedAop
public class PatientSummaryController {
    private final PatientService service;
    public PatientSummaryController(PatientService service) { this.service=service; }
    @GetMapping("/summary")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<PatientSummaryResponse> handle() { return ApiResponse.ok(service.summary()); }
}
