package com.bgssai.health.admin.record.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.record.service.RecordService;
import com.bgssai.health.record.dto.*;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/records")
@NeedAop
public class CreateObservationController {
    private final RecordService service;
    public CreateObservationController(RecordService service) { this.service=service; }
    @PostMapping("/observation")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<RecordResponse> handle(@RequestBody @Valid StaffObservationRequest request) { return ApiResponse.ok(service.observe(request)); }
}
