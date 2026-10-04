package com.boruikang.health.admin.patient.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.patient.service.PatientService;
import com.boruikang.health.patient.dto.CreatePatientRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/patients")
@NeedAop
public class CreatePatientController {
    private final PatientService service;
    public CreatePatientController(PatientService service) { this.service=service; }
    @PostMapping("/create")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<com.boruikang.health.patient.dto.PatientResponse> handle(@RequestBody @Valid CreatePatientRequest request) { return ApiResponse.ok(service.create(request)); }
}
