package com.bgssai.health.admin.task.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.task.service.TaskService;
import com.bgssai.health.task.dto.TransitionTaskRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/tasks")
@NeedAop
public class TransitionTaskController {
    private final TaskService service;
    public TransitionTaskController(TaskService service) { this.service=service; }
    @PostMapping("/transition")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<com.bgssai.health.task.dto.TaskResponse> handle(@RequestBody @Valid TransitionTaskRequest request) { return ApiResponse.ok(service.transition(request)); }
}
