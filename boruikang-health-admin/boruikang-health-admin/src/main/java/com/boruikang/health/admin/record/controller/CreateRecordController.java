package com.boruikang.health.admin.record.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.record.service.RecordService;
import com.boruikang.health.record.dto.CreateRecordRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/records")
@NeedAop
public class CreateRecordController {
    private final RecordService service;
    public CreateRecordController(RecordService service) { this.service=service; }
    @PostMapping("/create")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<com.boruikang.health.record.dto.RecordResponse> handle(@RequestBody @Valid CreateRecordRequest request) { return ApiResponse.ok(service.create(request)); }
}
