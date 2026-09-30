package com.bgssai.health.admin.record.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.record.service.RecordService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/records")
@NeedAop
public class ReviewRecordController {
    private final RecordService service;
    public ReviewRecordController(RecordService service) { this.service=service; }
    @PostMapping("/review")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<com.bgssai.health.record.dto.ReportResponse> handle(@RequestBody @Valid com.bgssai.health.record.dto.ReviewRecordRequest request) { return ApiResponse.ok(service.review(request)); }
}
