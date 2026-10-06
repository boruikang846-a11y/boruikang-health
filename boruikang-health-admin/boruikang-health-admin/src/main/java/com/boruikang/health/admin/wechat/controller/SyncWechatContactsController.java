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
public class SyncWechatContactsController {
    private final WechatContactService service;
    public SyncWechatContactsController(WechatContactService service) { this.service=service; }
    @PostMapping("/sync")
    @RateLimit(capacity=6,refillPerMinute=6)
    public ApiResponse<SyncWechatContactsResponse> handle(@RequestBody @Valid SyncWechatContactsRequest request) { return ApiResponse.ok(service.sync(request)); }
}
