package com.boruikang.health.admin.invitation.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.invitation.service.InvitationService;
import com.boruikang.health.invitation.dto.*;
import com.boruikang.health.common.Paged;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/invitations")
@NeedAop
public class QueryInvitationsController {
    private final InvitationService service;
    public QueryInvitationsController(InvitationService service) { this.service=service; }
    @PostMapping("/query")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<Paged<InvitationResponse>> handle(@RequestBody @Valid InvitationQueryRequest request) { return ApiResponse.ok(service.query(request)); }
}
