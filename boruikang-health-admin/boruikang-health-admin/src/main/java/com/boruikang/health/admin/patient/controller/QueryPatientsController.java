package com.boruikang.health.admin.patient.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.patient.service.PatientService;
import com.boruikang.health.patient.dto.PatientQueryRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/patients")
@NeedAop
public class QueryPatientsController {
    private final PatientService service;
    public QueryPatientsController(PatientService service) { this.service=service; }
    @PostMapping("/query")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<com.boruikang.health.common.Paged<com.boruikang.health.patient.dto.PatientResponse>> handle(@RequestBody @Valid PatientQueryRequest request) { return ApiResponse.ok(service.query(request)); }
}
