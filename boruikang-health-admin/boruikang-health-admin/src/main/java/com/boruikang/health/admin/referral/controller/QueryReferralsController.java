package com.boruikang.health.admin.referral.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.referral.service.ReferralService;
import com.boruikang.health.referral.dto.*;
import com.boruikang.health.common.Paged;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/referrals")
@NeedAop
public class QueryReferralsController {
    private final ReferralService service;
    public QueryReferralsController(ReferralService service) { this.service=service; }
    @PostMapping("/query")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<Paged<ReferralResponse>> handle(@RequestBody @Valid ReferralQueryRequest request) { return ApiResponse.ok(service.query(request)); }
}
