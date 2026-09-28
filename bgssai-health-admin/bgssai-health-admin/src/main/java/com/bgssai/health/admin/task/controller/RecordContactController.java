package com.bgssai.health.admin.task.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.task.service.TaskService;
import com.bgssai.health.task.dto.RecordContactRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/tasks")
@NeedAop
public class RecordContactController {
    private final TaskService service;
    public RecordContactController(TaskService service) { this.service=service; }
    @PostMapping("/contact")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<com.bgssai.health.task.dto.TaskResponse> handle(@RequestBody @Valid RecordContactRequest request) { return ApiResponse.ok(service.contact(request)); }
}
