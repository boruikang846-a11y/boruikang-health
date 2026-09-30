package com.bgssai.health.admin.task.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.task.service.TaskService;
import com.bgssai.health.task.dto.TaskQueryRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/tasks")
@NeedAop
public class QueryTasksController {
    private final TaskService service;
    public QueryTasksController(TaskService service) { this.service=service; }
    @PostMapping("/query")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<com.bgssai.health.common.Paged<com.bgssai.health.task.dto.TaskResponse>> handle(@RequestBody @Valid TaskQueryRequest request) { return ApiResponse.ok(service.query(request)); }
}
