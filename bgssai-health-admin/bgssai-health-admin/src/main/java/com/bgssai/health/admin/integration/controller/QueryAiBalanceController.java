package com.bgssai.health.admin.integration.controller;

import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.integration.dto.AiBalanceResponse;
import com.bgssai.health.integration.service.AiBalanceService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/bgssai/admin/integrations/ai")
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
