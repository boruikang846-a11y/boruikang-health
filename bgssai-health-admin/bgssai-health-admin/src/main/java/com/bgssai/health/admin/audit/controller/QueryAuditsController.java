package com.bgssai.health.admin.audit.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.audit.service.AuditService;
import com.bgssai.health.audit.dto.AuditQueryRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/audits")
@NeedAop
public class QueryAuditsController {
    private final AuditService service;
    public QueryAuditsController(AuditService service) { this.service=service; }
    @PostMapping("/query")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<com.bgssai.health.common.Paged<com.bgssai.health.audit.dto.AuditResponse>> handle(@RequestBody @Valid AuditQueryRequest request) { return ApiResponse.ok(service.query(request)); }
}
