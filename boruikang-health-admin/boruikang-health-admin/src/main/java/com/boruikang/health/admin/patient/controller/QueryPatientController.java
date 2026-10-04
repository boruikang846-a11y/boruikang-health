package com.boruikang.health.admin.patient.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.patient.service.PatientService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/patients")
@NeedAop
public class QueryPatientController {
    private final PatientService service;
    public QueryPatientController(PatientService service) { this.service=service; }
    @GetMapping("/{id}")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<com.boruikang.health.patient.dto.PatientResponse> handle(@PathVariable Long id) { return ApiResponse.ok(service.detail(id)); }
}
