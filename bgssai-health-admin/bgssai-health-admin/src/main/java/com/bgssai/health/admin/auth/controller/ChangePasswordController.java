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
public class ChangePasswordController {
    private final AccountService service;
    public ChangePasswordController(AccountService service) { this.service=service; }
    @PostMapping("/password")
    @RateLimit(capacity=10, refillPerMinute=10)
    public ApiResponse<com.bgssai.health.auth.dto.LoginResponse> handle(@RequestBody @Valid com.bgssai.health.auth.dto.ChangePasswordRequest request) { return ApiResponse.ok(service.changePassword(request)); }
}
