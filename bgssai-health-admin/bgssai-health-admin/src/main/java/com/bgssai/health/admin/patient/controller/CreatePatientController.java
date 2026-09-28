package com.bgssai.health.admin.patient.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.patient.service.PatientService;
import com.bgssai.health.patient.dto.CreatePatientRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/patients")
@NeedAop
public class CreatePatientController {
    private final PatientService service;
    public CreatePatientController(PatientService service) { this.service=service; }
    @PostMapping("/create")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<com.bgssai.health.patient.dto.PatientResponse> handle(@RequestBody @Valid CreatePatientRequest request) { return ApiResponse.ok(service.create(request)); }
}
