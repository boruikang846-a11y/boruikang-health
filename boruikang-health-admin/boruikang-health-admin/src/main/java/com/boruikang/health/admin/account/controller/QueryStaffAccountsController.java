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
public class QueryStaffAccountsController {
    private final StaffAccountService service;
    public QueryStaffAccountsController(StaffAccountService service) { this.service=service; }
    @PostMapping("/query")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<com.boruikang.health.common.Paged<com.boruikang.health.account.dto.StaffAccountResponse>> handle(@RequestBody @Valid com.boruikang.health.account.dto.StaffAccountQueryRequest request) { return ApiResponse.ok(service.query(request)); }
}
