package com.boruikang.health.health.ui;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.health.service.QueryLivenessService;

/**
 * GET /boruikang/health/liveness —— 公开存活探针（Standards §13.3 / §13.4）。
 * 不带 {@code jwtToken}（故不加 {@code @NeedAop}），HTTP 恒为 200。
 */
@RestController
public class QueryLivenessController {

    @Autowired
    private QueryLivenessService queryLivenessService;

    @GetMapping("/boruikang/health/liveness")
    public ApiResponse handle() {
        ApiResponse response = new ApiResponse();
        response.setCode("0");
        response.setSuccess(true);
        response.setResult(queryLivenessService.liveness());
        return response;
    }
}
