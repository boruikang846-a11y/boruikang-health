package com.bgssai.health.admin.auth.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.auth.service.AccountService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin")
@NeedAop
public class QueryAccountController {
    private final AccountService service;
    public QueryAccountController(AccountService service) { this.service=service; }
    @GetMapping("/me")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<com.bgssai.health.auth.dto.AccountInfo> handle() { return ApiResponse.ok(service.me()); }
}
