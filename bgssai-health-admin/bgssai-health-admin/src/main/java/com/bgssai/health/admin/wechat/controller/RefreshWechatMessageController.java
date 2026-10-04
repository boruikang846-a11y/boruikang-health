package com.bgssai.health.admin.wechat.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.common.dto.IdRequest;
import com.bgssai.health.wechat.dto.*;
import com.bgssai.health.wechat.service.WechatMessageService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/wechat/messages")
@NeedAop
public class RefreshWechatMessageController {
    private final WechatMessageService service;
    public RefreshWechatMessageController(WechatMessageService service) { this.service=service; }
    @PostMapping("/refresh")
    @RateLimit(capacity=60,refillPerMinute=60)
    public ApiResponse<WechatMessageResponse> handle(@RequestBody @Valid IdRequest request) { return ApiResponse.ok(service.refresh(request.id())); }
}
