package com.boruikang.health.admin.record.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.record.service.RecordService;
import com.boruikang.health.record.dto.*;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/records")
@NeedAop
public class CreateObservationController {
    private final RecordService service;
    public CreateObservationController(RecordService service) { this.service=service; }
    @PostMapping("/observation")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<RecordResponse> handle(@RequestBody @Valid StaffObservationRequest request) { return ApiResponse.ok(service.observe(request)); }
}
