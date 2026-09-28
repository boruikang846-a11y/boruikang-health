package com.bgssai.health.admin.patient.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.patient.dto.*;
import com.bgssai.health.patient.service.PatientService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/clinicians")
@NeedAop
public class CreateClinicianController {
    private final PatientService service;
    public CreateClinicianController(PatientService service) { this.service=service; }
    @PostMapping("/create")
    @RateLimit(capacity=30, refillPerMinute=30)
    public ApiResponse<ClinicianInfo> handle(@RequestBody @Valid CreateClinicianRequest request) { return ApiResponse.ok(service.createClinician(request)); }
}
