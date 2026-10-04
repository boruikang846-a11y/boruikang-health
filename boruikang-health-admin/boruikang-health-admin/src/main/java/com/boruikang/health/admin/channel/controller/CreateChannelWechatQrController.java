package com.boruikang.health.admin.channel.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.channel.dto.ChannelResponse;
import com.boruikang.health.channel.dto.WechatQrRequest;
import com.boruikang.health.channel.service.ChannelService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/channels")
@NeedAop
public class CreateChannelWechatQrController {
    private final ChannelService service;
    public CreateChannelWechatQrController(ChannelService service) { this.service=service; }
    @PostMapping("/wechat-qr")
    @RateLimit(capacity=30,refillPerMinute=30)
    public ApiResponse<ChannelResponse> handle(@RequestBody @Valid WechatQrRequest request) { return ApiResponse.ok(service.wechatQr(request)); }
}
