package com.boruikang.health.admin.account.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.account.dto.SetStaffWecomRequest;
import com.boruikang.health.account.dto.StaffAccountResponse;
import com.boruikang.health.account.service.StaffAccountService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/accounts")
@NeedAop
public class SetStaffWecomController {
    private final StaffAccountService service;
    public SetStaffWecomController(StaffAccountService service) { this.service=service; }
    @PostMapping("/wecom")
    @RateLimit(capacity=60,refillPerMinute=60)
    public ApiResponse<StaffAccountResponse> handle(@RequestBody @Valid SetStaffWecomRequest request) { return ApiResponse.ok(service.setWecom(request)); }
}
