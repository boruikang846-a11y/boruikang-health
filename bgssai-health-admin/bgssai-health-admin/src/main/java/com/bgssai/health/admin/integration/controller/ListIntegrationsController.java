package com.bgssai.health.admin.integration.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.integration.service.IntegrationService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin")
@NeedAop
public class ListIntegrationsController {
    private final IntegrationService service;
    public ListIntegrationsController(IntegrationService service) { this.service=service; }
    @GetMapping("/integrations")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<java.util.List<com.bgssai.health.integration.dto.IntegrationResponse>> handle() { return ApiResponse.ok(service.list()); }
}
