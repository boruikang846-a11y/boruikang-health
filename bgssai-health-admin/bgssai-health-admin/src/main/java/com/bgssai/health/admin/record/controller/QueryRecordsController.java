package com.bgssai.health.admin.record.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.record.service.RecordService;
import com.bgssai.health.record.dto.RecordQueryRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/records")
@NeedAop
public class QueryRecordsController {
    private final RecordService service;
    public QueryRecordsController(RecordService service) { this.service=service; }
    @PostMapping("/query")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<com.bgssai.health.common.Paged<com.bgssai.health.record.dto.RecordResponse>> handle(@RequestBody @Valid RecordQueryRequest request) { return ApiResponse.ok(service.query(request)); }
}
