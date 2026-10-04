package com.boruikang.health.admin.wechat.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.common.Paged;
import com.boruikang.health.wechat.dto.*;
import com.boruikang.health.wechat.service.WechatContactService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/wechat/contacts")
@NeedAop
public class QueryWechatContactsController {
    private final WechatContactService service;
    public QueryWechatContactsController(WechatContactService service) { this.service=service; }
    @PostMapping("/query")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<Paged<WechatContactResponse>> handle(@RequestBody @Valid WechatContactQueryRequest request) { return ApiResponse.ok(service.query(request)); }
}
