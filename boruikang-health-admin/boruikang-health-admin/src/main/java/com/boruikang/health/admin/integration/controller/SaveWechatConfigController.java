package com.boruikang.health.admin.integration.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.integration.dto.IntegrationResponse;
import com.boruikang.health.wechat.dto.SaveWechatConfigRequest;
import com.boruikang.health.wechat.service.WechatConfigService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/integrations/wechat")
@NeedAop
public class SaveWechatConfigController {
    private final WechatConfigService service;
    public SaveWechatConfigController(WechatConfigService service) { this.service=service; }
    @PostMapping("/save")
    @RateLimit(capacity=60,refillPerMinute=60)
    public ApiResponse<IntegrationResponse> handle(@RequestBody @Valid SaveWechatConfigRequest request) { return ApiResponse.ok(service.save(request)); }
}
