package com.boruikang.health.admin.wechat.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.common.dto.IdRequest;
import com.boruikang.health.wechat.dto.*;
import com.boruikang.health.wechat.service.WechatContactService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/wechat/contacts")
@NeedAop
public class HandleWechatContactController {
    private final WechatContactService service;
    public HandleWechatContactController(WechatContactService service) { this.service=service; }
    @PostMapping("/handle")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<WechatContactResponse> handle(@RequestBody @Valid IdRequest request) { return ApiResponse.ok(service.handle(request.id())); }
}
