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
public class LogoutController {
    private final AccountService service;
    public LogoutController(AccountService service) { this.service=service; }
    @PostMapping("/logout")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<Void> handle() { service.logout(); return ApiResponse.ok(null); }
}
