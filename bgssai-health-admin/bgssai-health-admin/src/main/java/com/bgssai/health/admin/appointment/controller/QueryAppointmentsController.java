package com.bgssai.health.admin.appointment.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.appointment.service.AppointmentService;
import com.bgssai.health.appointment.dto.*;
import com.bgssai.health.common.Paged;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/appointments")
@NeedAop
public class QueryAppointmentsController {
    private final AppointmentService service;
    public QueryAppointmentsController(AppointmentService service) { this.service=service; }
    @PostMapping("/query")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<Paged<AppointmentResponse>> handle(@RequestBody @Valid AppointmentQueryRequest request) { return ApiResponse.ok(service.query(request)); }
}
