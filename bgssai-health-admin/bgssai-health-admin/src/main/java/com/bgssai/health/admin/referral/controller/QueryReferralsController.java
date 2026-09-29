package com.bgssai.health.admin.referral.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.referral.service.ReferralService;
import com.bgssai.health.referral.dto.*;
import com.bgssai.health.common.Paged;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/referrals")
@NeedAop
public class QueryReferralsController {
    private final ReferralService service;
    public QueryReferralsController(ReferralService service) { this.service=service; }
    @PostMapping("/query")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<Paged<ReferralResponse>> handle(@RequestBody @Valid ReferralQueryRequest request) { return ApiResponse.ok(service.query(request)); }
}
