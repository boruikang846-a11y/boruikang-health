package com.boruikang.health.admin.patient.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.patient.service.PatientService;
import com.boruikang.health.patient.dto.*;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/patients")
@NeedAop
public class RecordConsentController {
    private final PatientService service;
    public RecordConsentController(PatientService service) { this.service=service; }
    @PostMapping("/consent")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<PatientResponse> handle(@RequestBody @Valid ConsentRequest request) { return ApiResponse.ok(service.consent(request)); }
}
