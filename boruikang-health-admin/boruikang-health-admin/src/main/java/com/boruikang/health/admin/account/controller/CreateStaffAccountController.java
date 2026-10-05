package com.boruikang.health.admin.account.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.account.service.StaffAccountService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/accounts")
@NeedAop
public class CreateStaffAccountController {
    private final StaffAccountService service;
    public CreateStaffAccountController(StaffAccountService service) { this.service=service; }
    @PostMapping("/create")
    @RateLimit(capacity=30, refillPerMinute=30)
    public ApiResponse<com.boruikang.health.account.dto.StaffAccountResponse> handle(@RequestBody @Valid com.boruikang.health.account.dto.CreateStaffAccountRequest request) { return ApiResponse.ok(service.create(request)); }
}
