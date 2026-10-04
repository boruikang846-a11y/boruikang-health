package com.boruikang.health.admin.task.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.task.service.TaskService;
import com.boruikang.health.task.dto.DraftTaskRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/tasks")
@NeedAop
public class DraftTaskController {
    private final TaskService service;
    public DraftTaskController(TaskService service) { this.service=service; }
    @PostMapping("/draft")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<com.boruikang.health.task.dto.TaskResponse> handle(@RequestBody @Valid DraftTaskRequest request) { return ApiResponse.ok(service.draft(request)); }
}
