package com.bgssai.health.admin.patient.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.patient.service.PatientService;
import com.bgssai.health.patient.dto.*;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/patients")
@NeedAop
public class RecordConsentController {
    private final PatientService service;
    public RecordConsentController(PatientService service) { this.service=service; }
    @PostMapping("/consent")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<PatientResponse> handle(@RequestBody @Valid ConsentRequest request) { return ApiResponse.ok(service.consent(request)); }
}
