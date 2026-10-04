package com.boruikang.health.admin.task.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.task.service.TaskService;
import com.boruikang.health.task.dto.*;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/tasks")
@NeedAop
public class AcknowledgeTaskController {
    private final TaskService service;
    public AcknowledgeTaskController(TaskService service) { this.service=service; }
    @PostMapping("/acknowledge")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<TaskResponse> handle(@RequestBody @Valid AcknowledgeTaskRequest request) { return ApiResponse.ok(service.acknowledge(request)); }
}
