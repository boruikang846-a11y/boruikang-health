package com.boruikang.health.health.ui;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.health.HealthHttpStatus;
import com.boruikang.health.health.dto.ReadinessReport;
import com.boruikang.health.health.service.QueryReadinessService;

/**
 * GET /boruikang/health/readiness —— 公开就绪探针（Standards §13.3 / §13.4）；不带 {@code jwtToken}。
 * critical 组件 DOWN 时 HTTP 503，其余 200；{@code code} / {@code success} 恒表达「接口调用成功」，
 * 永不承载健康结论。
 */
@RestController
public class QueryReadinessController {

    @Autowired
    private QueryReadinessService queryReadinessService;

    @GetMapping("/boruikang/health/readiness")
    public ResponseEntity<ApiResponse> handle() {
        ReadinessReport report = queryReadinessService.readiness();
        ApiResponse response = new ApiResponse();
        response.setCode("0");
        response.setSuccess(true);
        response.setResult(report);
        return ResponseEntity.status(HealthHttpStatus.of(report.getStatus())).body(response);
    }
}
