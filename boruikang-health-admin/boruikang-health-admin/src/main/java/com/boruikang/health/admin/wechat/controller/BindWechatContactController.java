package com.boruikang.health.admin.wechat.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.wechat.dto.*;
import com.boruikang.health.wechat.service.WechatContactService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/wechat/contacts")
@NeedAop
public class BindWechatContactController {
    private final WechatContactService service;
    public BindWechatContactController(WechatContactService service) { this.service=service; }
    @PostMapping("/bind")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<WechatContactResponse> handle(@RequestBody @Valid BindWechatContactRequest request) { return ApiResponse.ok(service.bind(request)); }
}
