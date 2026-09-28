package com.bgssai.health.admin.task.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.task.service.TaskService;
import com.bgssai.health.task.dto.TaskContextResponse;
import org.springframework.web.bind.annotation.*;
@RestController @NeedAop @RequestMapping("/bgssai/admin/tasks")
public class QueryTaskContextController {
    private final TaskService service;
    public QueryTaskContextController(TaskService service){this.service=service;}
    @GetMapping("/{id}")
    public ApiResponse<TaskContextResponse> handle(@PathVariable Long id){return ApiResponse.ok(service.context(id));}
}
