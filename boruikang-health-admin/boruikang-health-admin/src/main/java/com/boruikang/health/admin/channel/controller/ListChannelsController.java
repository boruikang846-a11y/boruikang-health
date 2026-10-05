package com.boruikang.health.admin.channel.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.channel.service.ChannelService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin")
@NeedAop
public class ListChannelsController {
    private final ChannelService service;
    public ListChannelsController(ChannelService service) { this.service=service; }
    @GetMapping("/channels")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<com.boruikang.health.common.Paged<com.boruikang.health.channel.dto.ChannelResponse>> handle(@RequestParam(defaultValue="0") Integer page, @RequestParam(defaultValue="20") Integer size) { return ApiResponse.ok(service.query(page, size)); }
}
