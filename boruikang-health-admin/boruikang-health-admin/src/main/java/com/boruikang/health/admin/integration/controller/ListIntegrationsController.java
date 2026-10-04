package com.boruikang.health.admin.integration.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.integration.service.IntegrationService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin")
@NeedAop
public class ListIntegrationsController {
    private final IntegrationService service;
    public ListIntegrationsController(IntegrationService service) { this.service=service; }
    @GetMapping("/integrations")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<java.util.List<com.boruikang.health.integration.dto.IntegrationResponse>> handle() { return ApiResponse.ok(service.list()); }
}
