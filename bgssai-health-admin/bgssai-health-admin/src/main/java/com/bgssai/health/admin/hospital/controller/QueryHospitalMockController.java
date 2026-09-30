package com.bgssai.health.admin.hospital.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.hospital.dto.*;
import com.bgssai.health.hospital.service.HospitalSyncService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/hospital")
@NeedAop
public class QueryHospitalMockController {
    private final HospitalSyncService service;
    public QueryHospitalMockController(HospitalSyncService service){this.service=service;}
    @PostMapping("/mock/query")
    @RateLimit(capacity=30, refillPerMinute=30)
    public ApiResponse<HospitalBatchResponse> handle(@RequestBody @Valid HospitalQueryRequest request){return ApiResponse.ok(service.preview(request));}
}
