package com.bgssai.health.admin.knowledge.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.knowledge.service.KnowledgeService;
import com.bgssai.health.knowledge.dto.PublishKnowledgeRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/knowledge")
@NeedAop
public class PublishKnowledgeController {
    private final KnowledgeService service;
    public PublishKnowledgeController(KnowledgeService service) { this.service=service; }
    @PostMapping("/publish")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<com.bgssai.health.knowledge.dto.KnowledgeResponse> handle(@RequestBody @Valid PublishKnowledgeRequest request) { return ApiResponse.ok(service.publish(request)); }
}
