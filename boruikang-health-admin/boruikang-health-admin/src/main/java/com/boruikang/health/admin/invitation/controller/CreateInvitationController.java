package com.boruikang.health.admin.invitation.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.invitation.service.InvitationService;
import com.boruikang.health.invitation.dto.*;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/invitations")
@NeedAop
public class CreateInvitationController {
    private final InvitationService service;
    public CreateInvitationController(InvitationService service) { this.service=service; }
    @PostMapping("/create")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<InvitationResponse> handle(@RequestBody @Valid CreateInvitationRequest request) { return ApiResponse.ok(service.create(request)); }
}
