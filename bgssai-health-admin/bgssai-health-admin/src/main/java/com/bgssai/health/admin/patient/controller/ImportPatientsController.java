package com.bgssai.health.admin.patient.controller;

import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.patient.dto.ImportPatientsRequest;
import com.bgssai.health.patient.dto.ImportPatientsResponse;
import com.bgssai.health.patient.service.PatientService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/bgssai/admin/patients")
@NeedAop
public class ImportPatientsController {
    private final PatientService service;
    public ImportPatientsController(PatientService service) { this.service=service; }
    @PostMapping("/import")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<ImportPatientsResponse> handle(@RequestBody @Valid ImportPatientsRequest request) {
        return ApiResponse.ok(service.importRows(request));
    }
}
