package com.bgssai.health.admin.medication.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.medication.service.MedicationService;
import com.bgssai.health.medication.dto.*;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/medications")
@NeedAop
public class SaveMedicationController {
    private final MedicationService service;
    public SaveMedicationController(MedicationService service) { this.service=service; }
    @PostMapping("/save")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<MedicationResponse> handle(@RequestBody @Valid SaveMedicationRequest request) { return ApiResponse.ok(service.save(request)); }
}
