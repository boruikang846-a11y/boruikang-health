package com.boruikang.health.admin.audit.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.audit.service.AuditService;
import com.boruikang.health.audit.dto.AuditQueryRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/audits")
@NeedAop
public class QueryAuditsController {
    private final AuditService service;
    public QueryAuditsController(AuditService service) { this.service=service; }
    @PostMapping("/query")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<com.boruikang.health.common.Paged<com.boruikang.health.audit.dto.AuditResponse>> handle(@RequestBody @Valid AuditQueryRequest request) { return ApiResponse.ok(service.query(request)); }
}
