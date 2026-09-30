package com.bgssai.health.admin.patient.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.patient.service.PatientService;
import com.bgssai.health.patient.dto.UpdatePatientRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/patients")
@NeedAop
public class UpdatePatientController {
    private final PatientService service;
    public UpdatePatientController(PatientService service) { this.service=service; }
    @PostMapping("/update")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<com.bgssai.health.patient.dto.PatientResponse> handle(@RequestBody @Valid UpdatePatientRequest request) { return ApiResponse.ok(service.update(request)); }
}
