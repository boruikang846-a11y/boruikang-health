package com.boruikang.health.admin.knowledge.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.knowledge.service.KnowledgeService;
import com.boruikang.health.knowledge.dto.KnowledgeQueryRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/knowledge")
@NeedAop
public class QueryKnowledgeController {
    private final KnowledgeService service;
    public QueryKnowledgeController(KnowledgeService service) { this.service=service; }
    @PostMapping("/query")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<com.boruikang.health.common.Paged<com.boruikang.health.knowledge.dto.KnowledgeResponse>> handle(@RequestBody @Valid KnowledgeQueryRequest request) { return ApiResponse.ok(service.query(request)); }
}
