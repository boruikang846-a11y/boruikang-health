package com.bgssai.health.admin.task.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.task.service.TaskService;
import com.bgssai.health.task.dto.CreateTaskRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/tasks")
@NeedAop
public class CreateTaskController {
    private final TaskService service;
    public CreateTaskController(TaskService service) { this.service=service; }
    @PostMapping("/create")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<com.bgssai.health.task.dto.TaskResponse> handle(@RequestBody @Valid CreateTaskRequest request) { return ApiResponse.ok(service.create(request)); }
}
