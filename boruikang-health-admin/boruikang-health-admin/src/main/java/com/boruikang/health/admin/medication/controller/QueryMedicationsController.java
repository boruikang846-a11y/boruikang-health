package com.boruikang.health.admin.medication.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.medication.service.MedicationService;
import com.boruikang.health.medication.dto.*;
import java.util.List;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/medications")
@NeedAop
public class QueryMedicationsController {
    private final MedicationService service;
    public QueryMedicationsController(MedicationService service) { this.service=service; }
    @PostMapping("/query")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<List<MedicationResponse>> handle(@RequestBody @Valid MedicationQueryRequest request) { return ApiResponse.ok(service.query(request)); }
}
