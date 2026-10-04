package com.bgssai.health.admin.wechat.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.common.Paged;
import com.bgssai.health.wechat.dto.*;
import com.bgssai.health.wechat.service.WechatContactService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/wechat/contacts")
@NeedAop
public class QueryWechatContactsController {
    private final WechatContactService service;
    public QueryWechatContactsController(WechatContactService service) { this.service=service; }
    @PostMapping("/query")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<Paged<WechatContactResponse>> handle(@RequestBody @Valid WechatContactQueryRequest request) { return ApiResponse.ok(service.query(request)); }
}
