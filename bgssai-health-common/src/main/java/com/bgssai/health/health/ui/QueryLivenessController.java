package com.bgssai.health.health.ui;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.health.service.QueryLivenessService;

/**
 * GET /bgssai/health/liveness —— 公开存活探针（Standards §13.3 / §13.4）。
 * 不带 {@code jwtToken}（故不加 {@code @NeedAop}），HTTP 恒为 200。
 */
@RestController
public class QueryLivenessController {

    @Autowired
    private QueryLivenessService queryLivenessService;

    @GetMapping("/bgssai/health/liveness")
    public ApiResponse handle() {
        ApiResponse response = new ApiResponse();
        response.setCode("0");
        response.setSuccess(true);
        response.setResult(queryLivenessService.liveness());
        return response;
    }
}
