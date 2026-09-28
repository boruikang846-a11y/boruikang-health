package com.bgssai.health.admin.integration.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.integration.service.IntegrationService;
import com.bgssai.health.integration.dto.SaveIntegrationRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/integrations")
@NeedAop
public class SaveIntegrationController {
    private final IntegrationService service;
    public SaveIntegrationController(IntegrationService service) { this.service=service; }
    @PostMapping("/save")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<com.bgssai.health.integration.dto.IntegrationResponse> handle(@RequestBody @Valid SaveIntegrationRequest request) { return ApiResponse.ok(service.save(request)); }
}
