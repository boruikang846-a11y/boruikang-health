package com.bgssai.health.admin.invitation.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.invitation.service.InvitationService;
import com.bgssai.health.invitation.dto.*;
import com.bgssai.health.common.Paged;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/invitations")
@NeedAop
public class QueryInvitationsController {
    private final InvitationService service;
    public QueryInvitationsController(InvitationService service) { this.service=service; }
    @PostMapping("/query")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<Paged<InvitationResponse>> handle(@RequestBody @Valid InvitationQueryRequest request) { return ApiResponse.ok(service.query(request)); }
}
