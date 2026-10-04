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
public class UnbindWechatContactController {
    private final WechatContactService service;
    public UnbindWechatContactController(WechatContactService service) { this.service=service; }
    @PostMapping("/unbind")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<WechatContactResponse> handle(@RequestBody @Valid UnbindWechatContactRequest request) { return ApiResponse.ok(service.unbind(request)); }
}
