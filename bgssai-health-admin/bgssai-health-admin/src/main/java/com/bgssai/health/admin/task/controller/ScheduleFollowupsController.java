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
public class ScheduleFollowupsController {
    private final TaskService service;
    public ScheduleFollowupsController(TaskService service) { this.service=service; }
    @PostMapping("/schedule")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<java.util.List<TaskResponse>> handle(@RequestBody @Valid ScheduleFollowupsRequest request) { return ApiResponse.ok(service.schedule(request)); }
}
