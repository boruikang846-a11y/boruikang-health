package com.bgssai.health.admin.invitation.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.invitation.service.InvitationService;
import com.bgssai.health.invitation.dto.*;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/invitations")
@NeedAop
public class CreateInvitationController {
    private final InvitationService service;
    public CreateInvitationController(InvitationService service) { this.service=service; }
    @PostMapping("/create")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<InvitationResponse> handle(@RequestBody @Valid CreateInvitationRequest request) { return ApiResponse.ok(service.create(request)); }
}
