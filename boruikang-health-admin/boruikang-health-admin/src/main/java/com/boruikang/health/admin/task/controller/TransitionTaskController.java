package com.boruikang.health.admin.task.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.task.service.TaskService;
import com.boruikang.health.task.dto.TransitionTaskRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/tasks")
@NeedAop
public class TransitionTaskController {
    private final TaskService service;
    public TransitionTaskController(TaskService service) { this.service=service; }
    @PostMapping("/transition")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<com.boruikang.health.task.dto.TaskResponse> handle(@RequestBody @Valid TransitionTaskRequest request) { return ApiResponse.ok(service.transition(request)); }
}
