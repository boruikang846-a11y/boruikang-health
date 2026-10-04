package com.bgssai.health.admin.account.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.account.dto.SetStaffWecomRequest;
import com.bgssai.health.account.dto.StaffAccountResponse;
import com.bgssai.health.account.service.StaffAccountService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/accounts")
@NeedAop
public class SetStaffWecomController {
    private final StaffAccountService service;
    public SetStaffWecomController(StaffAccountService service) { this.service=service; }
    @PostMapping("/wecom")
    @RateLimit(capacity=60,refillPerMinute=60)
    public ApiResponse<StaffAccountResponse> handle(@RequestBody @Valid SetStaffWecomRequest request) { return ApiResponse.ok(service.setWecom(request)); }
}
