package com.boruikang.health.health.ui;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.health.HealthHttpStatus;
import com.boruikang.health.health.dto.HealthReport;
import com.boruikang.health.health.service.QueryHealthReportService;

/**
 * GET /boruikang/health —— 公开全量健康报告（Standards §13.3 / §13.4）；不带 {@code jwtToken}。
 * 聚合状态为 DOWN 时 HTTP 503，其余 200。
 */
@RestController
public class QueryHealthReportController {

    @Autowired
    private QueryHealthReportService queryHealthReportService;

    @GetMapping("/boruikang/health")
    public ResponseEntity<ApiResponse> handle() {
        HealthReport report = queryHealthReportService.report();
        ApiResponse response = new ApiResponse();
        response.setCode("0");
        response.setSuccess(true);
        response.setResult(report);
        return ResponseEntity.status(HealthHttpStatus.of(report.getStatus())).body(response);
    }
}
