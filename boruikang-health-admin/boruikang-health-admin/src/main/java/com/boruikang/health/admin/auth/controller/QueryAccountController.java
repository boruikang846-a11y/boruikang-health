package com.boruikang.health.admin.auth.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.auth.service.AccountService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin")
@NeedAop
public class QueryAccountController {
    private final AccountService service;
    public QueryAccountController(AccountService service) { this.service=service; }
    @GetMapping("/me")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<com.boruikang.health.auth.dto.AccountInfo> handle() { return ApiResponse.ok(service.me()); }
}
