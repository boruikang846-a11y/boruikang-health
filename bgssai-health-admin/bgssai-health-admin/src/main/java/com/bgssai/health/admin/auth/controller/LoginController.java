package com.bgssai.health.admin.auth.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.auth.service.AccountService;
import com.bgssai.health.auth.dto.LoginRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin")

public class LoginController {
    private final AccountService service;
    public LoginController(AccountService service) { this.service=service; }
    @PostMapping("/login")
    @RateLimit(capacity=20, refillPerMinute=20)
    public ApiResponse<com.bgssai.health.auth.dto.LoginResponse> handle(@RequestBody @Valid LoginRequest request) { return ApiResponse.ok(service.login(request)); }
}
