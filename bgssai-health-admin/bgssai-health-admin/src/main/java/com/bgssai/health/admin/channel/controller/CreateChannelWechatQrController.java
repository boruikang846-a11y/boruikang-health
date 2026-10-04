package com.bgssai.health.admin.channel.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.channel.dto.ChannelResponse;
import com.bgssai.health.channel.dto.WechatQrRequest;
import com.bgssai.health.channel.service.ChannelService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/channels")
@NeedAop
public class CreateChannelWechatQrController {
    private final ChannelService service;
    public CreateChannelWechatQrController(ChannelService service) { this.service=service; }
    @PostMapping("/wechat-qr")
    @RateLimit(capacity=30,refillPerMinute=30)
    public ApiResponse<ChannelResponse> handle(@RequestBody @Valid WechatQrRequest request) { return ApiResponse.ok(service.wechatQr(request)); }
}
