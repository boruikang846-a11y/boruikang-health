package com.boruikang.health.admin.patient.controller;

import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.patient.dto.ImportPatientsRequest;
import com.boruikang.health.patient.dto.ImportPatientsResponse;
import com.boruikang.health.patient.service.PatientService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/boruikang/admin/patients")
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
