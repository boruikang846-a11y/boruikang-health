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
public class ChangePasswordController {
    private final AccountService service;
    public ChangePasswordController(AccountService service) { this.service=service; }
    @PostMapping("/password")
    @RateLimit(capacity=10, refillPerMinute=10)
    public ApiResponse<com.boruikang.health.auth.dto.LoginResponse> handle(@RequestBody @Valid com.boruikang.health.auth.dto.ChangePasswordRequest request) { return ApiResponse.ok(service.changePassword(request)); }
}
