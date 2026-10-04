package com.bgssai.health.admin.wechat.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.wechat.dto.MockInboundRequest;
import com.bgssai.health.wechat.service.WechatInboundService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/wechat/mock")
@NeedAop
public class SimulateWechatInboundController {
    private final WechatInboundService service;
    public SimulateWechatInboundController(WechatInboundService service) { this.service=service; }
    @PostMapping("/inbound")
    @RateLimit(capacity=60,refillPerMinute=60)
    public ApiResponse<Boolean> handle(@RequestBody @Valid MockInboundRequest request) { service.simulate(request);return ApiResponse.ok(true); }
}
