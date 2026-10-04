package com.boruikang.health.admin.auth.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.auth.service.AccountService;
import com.boruikang.health.auth.dto.LoginRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin")

public class LoginController {
    private final AccountService service;
    public LoginController(AccountService service) { this.service=service; }
    @PostMapping("/login")
    @RateLimit(capacity=20, refillPerMinute=20)
    public ApiResponse<com.boruikang.health.auth.dto.LoginResponse> handle(@RequestBody @Valid LoginRequest request) { return ApiResponse.ok(service.login(request)); }
}
