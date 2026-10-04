package com.bgssai.health.admin.integration.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.integration.dto.IntegrationResponse;
import com.bgssai.health.wechat.dto.SaveWechatConfigRequest;
import com.bgssai.health.wechat.service.WechatConfigService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/integrations/wechat")
@NeedAop
public class SaveWechatConfigController {
    private final WechatConfigService service;
    public SaveWechatConfigController(WechatConfigService service) { this.service=service; }
    @PostMapping("/save")
    @RateLimit(capacity=60,refillPerMinute=60)
    public ApiResponse<IntegrationResponse> handle(@RequestBody @Valid SaveWechatConfigRequest request) { return ApiResponse.ok(service.save(request)); }
}
