package com.boruikang.health.admin.medication.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.medication.service.MedicationService;
import com.boruikang.health.medication.dto.*;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/medications")
@NeedAop
public class SaveMedicationController {
    private final MedicationService service;
    public SaveMedicationController(MedicationService service) { this.service=service; }
    @PostMapping("/save")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<MedicationResponse> handle(@RequestBody @Valid SaveMedicationRequest request) { return ApiResponse.ok(service.save(request)); }
}
