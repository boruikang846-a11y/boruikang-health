package com.bgssai.health.admin.channel.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.channel.service.ChannelService;
import com.bgssai.health.channel.dto.CreateChannelRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/channels")
@NeedAop
public class CreateChannelController {
    private final ChannelService service;
    public CreateChannelController(ChannelService service) { this.service=service; }
    @PostMapping("/create")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<com.bgssai.health.channel.dto.ChannelResponse> handle(@RequestBody @Valid CreateChannelRequest request) { return ApiResponse.ok(service.create(request)); }
}
