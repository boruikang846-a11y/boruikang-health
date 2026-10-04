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
public class LogoutController {
    private final AccountService service;
    public LogoutController(AccountService service) { this.service=service; }
    @PostMapping("/logout")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<Void> handle() { service.logout(); return ApiResponse.ok(null); }
}
