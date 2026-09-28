package com.bgssai.health.admin.message.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.message.service.MessageService;
import com.bgssai.health.message.dto.MessageQueryRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/messages")
@NeedAop
public class QueryMessagesController {
    private final MessageService service;
    public QueryMessagesController(MessageService service) { this.service=service; }
    @PostMapping("/query")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<com.bgssai.health.common.Paged<com.bgssai.health.message.dto.MessageResponse>> handle(@RequestBody @Valid MessageQueryRequest request) { return ApiResponse.ok(service.query(request)); }
}
