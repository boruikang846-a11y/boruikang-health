package com.bgssai.health.admin.patient.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.patient.service.PatientService;
import com.bgssai.health.patient.dto.PatientQueryRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/patients")
@NeedAop
public class QueryPatientsController {
    private final PatientService service;
    public QueryPatientsController(PatientService service) { this.service=service; }
    @PostMapping("/query")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<com.bgssai.health.common.Paged<com.bgssai.health.patient.dto.PatientResponse>> handle(@RequestBody @Valid PatientQueryRequest request) { return ApiResponse.ok(service.query(request)); }
}
