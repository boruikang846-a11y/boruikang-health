package com.bgssai.health.admin.medication.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.medication.service.MedicationService;
import com.bgssai.health.medication.dto.*;
import java.util.List;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/medications")
@NeedAop
public class QueryMedicationsController {
    private final MedicationService service;
    public QueryMedicationsController(MedicationService service) { this.service=service; }
    @PostMapping("/query")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<List<MedicationResponse>> handle(@RequestBody @Valid MedicationQueryRequest request) { return ApiResponse.ok(service.query(request)); }
}
