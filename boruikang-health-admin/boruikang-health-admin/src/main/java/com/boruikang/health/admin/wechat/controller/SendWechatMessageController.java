package com.boruikang.health.admin.wechat.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.wechat.dto.*;
import com.boruikang.health.wechat.service.WechatMessageService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/wechat/messages")
@NeedAop
public class SendWechatMessageController {
    private final WechatMessageService service;
    public SendWechatMessageController(WechatMessageService service) { this.service=service; }
    @PostMapping("/send")
    @RateLimit(capacity=60,refillPerMinute=60)
    public ApiResponse<WechatMessageResponse> handle(@RequestBody @Valid SendWechatMessageRequest request) { return ApiResponse.ok(service.send(request)); }
}
