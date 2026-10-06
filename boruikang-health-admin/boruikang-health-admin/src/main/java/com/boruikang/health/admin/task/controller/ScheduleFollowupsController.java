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
public class ScheduleFollowupsController {
    private final TaskService service;
    public ScheduleFollowupsController(TaskService service) { this.service=service; }
    @PostMapping("/schedule")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<java.util.List<TaskResponse>> handle(@RequestBody @Valid ScheduleFollowupsRequest request) { return ApiResponse.ok(service.schedule(request)); }
}
