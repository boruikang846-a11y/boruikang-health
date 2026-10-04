package com.boruikang.health.admin.hospital.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.hospital.dto.*;
import com.boruikang.health.hospital.service.HospitalSyncService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/hospital")
@NeedAop
public class QueryHospitalMockController {
    private final HospitalSyncService service;
    public QueryHospitalMockController(HospitalSyncService service){this.service=service;}
    @PostMapping("/mock/query")
    @RateLimit(capacity=30, refillPerMinute=30)
    public ApiResponse<HospitalBatchResponse> handle(@RequestBody @Valid HospitalQueryRequest request){return ApiResponse.ok(service.preview(request));}
}
