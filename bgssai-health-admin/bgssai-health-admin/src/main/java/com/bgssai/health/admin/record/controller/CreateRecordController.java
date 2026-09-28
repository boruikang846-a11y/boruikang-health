package com.bgssai.health.admin.record.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.record.service.RecordService;
import com.bgssai.health.record.dto.CreateRecordRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/records")
@NeedAop
public class CreateRecordController {
    private final RecordService service;
    public CreateRecordController(RecordService service) { this.service=service; }
    @PostMapping("/create")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<com.bgssai.health.record.dto.RecordResponse> handle(@RequestBody @Valid CreateRecordRequest request) { return ApiResponse.ok(service.create(request)); }
}
