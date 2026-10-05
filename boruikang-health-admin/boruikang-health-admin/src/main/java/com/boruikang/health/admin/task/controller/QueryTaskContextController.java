package com.boruikang.health.admin.task.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.task.service.TaskService;
import com.boruikang.health.task.dto.TaskContextResponse;
import org.springframework.web.bind.annotation.*;
@RestController @NeedAop @RequestMapping("/boruikang/admin/tasks")
public class QueryTaskContextController {
    private final TaskService service;
    public QueryTaskContextController(TaskService service){this.service=service;}
    @GetMapping("/{id}")
    public ApiResponse<TaskContextResponse> handle(@PathVariable Long id){return ApiResponse.ok(service.context(id));}
}
