package com.bgssai.health.admin.knowledge.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.knowledge.service.KnowledgeService;
import com.bgssai.health.knowledge.dto.KnowledgeQueryRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/knowledge")
@NeedAop
public class QueryKnowledgeController {
    private final KnowledgeService service;
    public QueryKnowledgeController(KnowledgeService service) { this.service=service; }
    @PostMapping("/query")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<com.bgssai.health.common.Paged<com.bgssai.health.knowledge.dto.KnowledgeResponse>> handle(@RequestBody @Valid KnowledgeQueryRequest request) { return ApiResponse.ok(service.query(request)); }
}
