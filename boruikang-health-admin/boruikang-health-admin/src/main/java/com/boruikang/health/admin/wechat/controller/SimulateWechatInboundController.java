package com.boruikang.health.admin.wechat.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.wechat.dto.MockInboundRequest;
import com.boruikang.health.wechat.service.WechatInboundService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/wechat/mock")
@NeedAop
public class SimulateWechatInboundController {
    private final WechatInboundService service;
    public SimulateWechatInboundController(WechatInboundService service) { this.service=service; }
    @PostMapping("/inbound")
    @RateLimit(capacity=60,refillPerMinute=60)
    public ApiResponse<Boolean> handle(@RequestBody @Valid MockInboundRequest request) { service.simulate(request);return ApiResponse.ok(true); }
}
