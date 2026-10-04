package com.bgssai.health.admin.integration.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.integration.dto.IntegrationResponse;
import com.bgssai.health.wechat.dto.VerifyWechatConfigRequest;
import com.bgssai.health.wechat.service.WechatConfigService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/integrations/wechat")
@NeedAop
public class VerifyWechatConfigController {
    private final WechatConfigService service;
    public VerifyWechatConfigController(WechatConfigService service) { this.service=service; }
    @PostMapping("/verify")
    @RateLimit(capacity=10,refillPerMinute=10)
    public ApiResponse<IntegrationResponse> handle(@RequestBody @Valid VerifyWechatConfigRequest request) { return ApiResponse.ok(service.verify(request)); }
}
