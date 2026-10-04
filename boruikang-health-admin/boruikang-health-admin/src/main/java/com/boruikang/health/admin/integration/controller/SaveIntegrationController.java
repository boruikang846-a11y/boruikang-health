package com.boruikang.health.admin.integration.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.integration.service.IntegrationService;
import com.boruikang.health.integration.dto.SaveIntegrationRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/integrations")
@NeedAop
public class SaveIntegrationController {
    private final IntegrationService service;
    public SaveIntegrationController(IntegrationService service) { this.service=service; }
    @PostMapping("/save")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<com.boruikang.health.integration.dto.IntegrationResponse> handle(@RequestBody @Valid SaveIntegrationRequest request) { return ApiResponse.ok(service.save(request)); }
}
