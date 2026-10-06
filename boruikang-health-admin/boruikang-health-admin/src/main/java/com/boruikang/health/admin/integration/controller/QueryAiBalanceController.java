package com.boruikang.health.admin.integration.controller;

import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.integration.dto.AiBalanceResponse;
import com.boruikang.health.integration.service.AiBalanceService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/boruikang/admin/integrations/ai")
@NeedAop
public class QueryAiBalanceController {
    private static final Logger log=LoggerFactory.getLogger(QueryAiBalanceController.class);
    private final AiBalanceService service;
    public QueryAiBalanceController(AiBalanceService service) { this.service=service; }

    @GetMapping("/balance")
    @RateLimit(capacity=6,refillPerMinute=6,keyBy=RateLimit.Key.USER)
    public ApiResponse<AiBalanceResponse> handle() {
        log.info("query AI account balance request");
        return ApiResponse.ok(service.query());
    }
}
