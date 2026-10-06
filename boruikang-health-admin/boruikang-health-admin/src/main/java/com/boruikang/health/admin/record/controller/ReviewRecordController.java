package com.boruikang.health.admin.record.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.record.service.RecordService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/records")
@NeedAop
public class ReviewRecordController {
    private final RecordService service;
    public ReviewRecordController(RecordService service) { this.service=service; }
    @PostMapping("/review")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<com.boruikang.health.record.dto.ReportResponse> handle(@RequestBody @Valid com.boruikang.health.record.dto.ReviewRecordRequest request) { return ApiResponse.ok(service.review(request)); }
}
