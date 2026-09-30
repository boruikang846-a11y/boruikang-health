package com.bgssai.health.admin.account.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.account.service.StaffAccountService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/accounts")
@NeedAop
public class ChangeStaffAccountStatusController {
    private final StaffAccountService service;
    public ChangeStaffAccountStatusController(StaffAccountService service) { this.service=service; }
    @PostMapping("/status")
    @RateLimit(capacity=30, refillPerMinute=30)
    public ApiResponse<com.bgssai.health.account.dto.StaffAccountResponse> handle(@RequestBody @Valid com.bgssai.health.account.dto.ChangeStaffStatusRequest request) { return ApiResponse.ok(service.changeStatus(request)); }
}
