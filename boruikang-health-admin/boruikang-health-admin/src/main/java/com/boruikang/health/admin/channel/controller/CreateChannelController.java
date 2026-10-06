package com.boruikang.health.admin.channel.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.channel.service.ChannelService;
import com.boruikang.health.channel.dto.CreateChannelRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/channels")
@NeedAop
public class CreateChannelController {
    private final ChannelService service;
    public CreateChannelController(ChannelService service) { this.service=service; }
    @PostMapping("/create")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<com.boruikang.health.channel.dto.ChannelResponse> handle(@RequestBody @Valid CreateChannelRequest request) { return ApiResponse.ok(service.create(request)); }
}
