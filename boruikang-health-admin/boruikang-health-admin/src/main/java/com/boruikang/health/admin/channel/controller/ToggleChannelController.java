package com.boruikang.health.admin.channel.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.channel.service.ChannelService;
import com.boruikang.health.channel.dto.ToggleChannelRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/channels")
@NeedAop
public class ToggleChannelController {
    private final ChannelService service;
    public ToggleChannelController(ChannelService service) { this.service=service; }
    @PostMapping("/toggle")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<com.boruikang.health.channel.dto.ChannelResponse> handle(@RequestBody @Valid ToggleChannelRequest request) { return ApiResponse.ok(service.toggle(request)); }
}
