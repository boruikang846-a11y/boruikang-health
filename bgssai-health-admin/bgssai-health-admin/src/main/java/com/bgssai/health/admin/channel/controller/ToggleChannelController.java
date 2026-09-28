package com.bgssai.health.admin.channel.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.channel.service.ChannelService;
import com.bgssai.health.channel.dto.ToggleChannelRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/channels")
@NeedAop
public class ToggleChannelController {
    private final ChannelService service;
    public ToggleChannelController(ChannelService service) { this.service=service; }
    @PostMapping("/toggle")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<com.bgssai.health.channel.dto.ChannelResponse> handle(@RequestBody @Valid ToggleChannelRequest request) { return ApiResponse.ok(service.toggle(request)); }
}
