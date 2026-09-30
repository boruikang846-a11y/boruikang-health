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
public class QueryStaffAccountsController {
    private final StaffAccountService service;
    public QueryStaffAccountsController(StaffAccountService service) { this.service=service; }
    @PostMapping("/query")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<com.bgssai.health.common.Paged<com.bgssai.health.account.dto.StaffAccountResponse>> handle(@RequestBody @Valid com.bgssai.health.account.dto.StaffAccountQueryRequest request) { return ApiResponse.ok(service.query(request)); }
}
