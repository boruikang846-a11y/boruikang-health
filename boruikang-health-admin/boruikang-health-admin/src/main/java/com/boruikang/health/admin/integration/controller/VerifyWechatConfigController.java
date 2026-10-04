package com.boruikang.health.admin.integration.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.integration.dto.IntegrationResponse;
import com.boruikang.health.wechat.dto.VerifyWechatConfigRequest;
import com.boruikang.health.wechat.service.WechatConfigService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/integrations/wechat")
@NeedAop
public class VerifyWechatConfigController {
    private final WechatConfigService service;
    public VerifyWechatConfigController(WechatConfigService service) { this.service=service; }
    @PostMapping("/verify")
    @RateLimit(capacity=10,refillPerMinute=10)
    public ApiResponse<IntegrationResponse> handle(@RequestBody @Valid VerifyWechatConfigRequest request) { return ApiResponse.ok(service.verify(request)); }
}
