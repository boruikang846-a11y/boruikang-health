package com.bgssai.health.admin.patient.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.patient.service.PatientService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/patients")
@NeedAop
public class QueryPatientController {
    private final PatientService service;
    public QueryPatientController(PatientService service) { this.service=service; }
    @GetMapping("/{id}")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<com.bgssai.health.patient.dto.PatientResponse> handle(@PathVariable Long id) { return ApiResponse.ok(service.detail(id)); }
}
