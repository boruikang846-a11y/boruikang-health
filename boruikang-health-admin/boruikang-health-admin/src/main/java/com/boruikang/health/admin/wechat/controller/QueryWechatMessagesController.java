package com.boruikang.health.admin.wechat.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.common.Paged;
import com.boruikang.health.wechat.dto.*;
import com.boruikang.health.wechat.service.WechatMessageService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/wechat/messages")
@NeedAop
public class QueryWechatMessagesController {
    private final WechatMessageService service;
    public QueryWechatMessagesController(WechatMessageService service) { this.service=service; }
    @PostMapping("/query")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<Paged<WechatMessageResponse>> handle(@RequestBody @Valid WechatMessageQueryRequest request) { return ApiResponse.ok(service.query(request)); }
}
