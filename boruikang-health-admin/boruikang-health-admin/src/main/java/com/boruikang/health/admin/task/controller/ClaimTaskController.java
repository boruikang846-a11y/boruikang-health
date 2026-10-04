package com.boruikang.health.admin.task.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.task.service.TaskService;
import com.boruikang.health.task.dto.ClaimTaskRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/tasks")
@NeedAop
public class ClaimTaskController {
    private final TaskService service;
    public ClaimTaskController(TaskService service) { this.service=service; }
    @PostMapping("/claim")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<com.boruikang.health.task.dto.TaskResponse> handle(@RequestBody @Valid ClaimTaskRequest request) { return ApiResponse.ok(service.claim(request)); }
}
