package com.bgssai.health.admin.task.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.task.service.TaskService;
import com.bgssai.health.task.dto.*;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/tasks")
@NeedAop
public class ReassignTaskController {
    private final TaskService service;
    public ReassignTaskController(TaskService service) { this.service=service; }
    @PostMapping("/reassign")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<TaskResponse> handle(@RequestBody @Valid ReassignTaskRequest request) { return ApiResponse.ok(service.reassign(request)); }
}
