package com.boruikang.health.admin.message.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.message.service.MessageService;
import com.boruikang.health.message.dto.MessageQueryRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/messages")
@NeedAop
public class QueryMessagesController {
    private final MessageService service;
    public QueryMessagesController(MessageService service) { this.service=service; }
    @PostMapping("/query")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<com.boruikang.health.common.Paged<com.boruikang.health.message.dto.MessageResponse>> handle(@RequestBody @Valid MessageQueryRequest request) { return ApiResponse.ok(service.query(request)); }
}
