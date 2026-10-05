package com.boruikang.health.admin.record.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.record.service.RecordService;
import com.boruikang.health.record.dto.RecordQueryRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/records")
@NeedAop
public class QueryRecordsController {
    private final RecordService service;
    public QueryRecordsController(RecordService service) { this.service=service; }
    @PostMapping("/query")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<com.boruikang.health.common.Paged<com.boruikang.health.record.dto.RecordResponse>> handle(@RequestBody @Valid RecordQueryRequest request) { return ApiResponse.ok(service.query(request)); }
}
