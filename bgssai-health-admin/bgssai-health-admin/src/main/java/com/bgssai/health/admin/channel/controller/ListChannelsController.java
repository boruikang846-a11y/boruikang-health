package com.bgssai.health.admin.channel.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.channel.service.ChannelService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin")
@NeedAop
public class ListChannelsController {
    private final ChannelService service;
    public ListChannelsController(ChannelService service) { this.service=service; }
    @GetMapping("/channels")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<com.bgssai.health.common.Paged<com.bgssai.health.channel.dto.ChannelResponse>> handle(@RequestParam(defaultValue="0") Integer page, @RequestParam(defaultValue="20") Integer size) { return ApiResponse.ok(service.query(page, size)); }
}
