package com.bgssai.health.admin.task.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.task.service.TaskService;
import com.bgssai.health.task.dto.DraftTaskRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/tasks")
@NeedAop
public class DraftTaskController {
    private final TaskService service;
    public DraftTaskController(TaskService service) { this.service=service; }
    @PostMapping("/draft")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<com.bgssai.health.task.dto.TaskResponse> handle(@RequestBody @Valid DraftTaskRequest request) { return ApiResponse.ok(service.draft(request)); }
}
