package com.boruikang.health.admin.appointment.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.appointment.service.AppointmentService;
import com.boruikang.health.appointment.dto.*;
import com.boruikang.health.common.Paged;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/appointments")
@NeedAop
public class QueryAppointmentsController {
    private final AppointmentService service;
    public QueryAppointmentsController(AppointmentService service) { this.service=service; }
    @PostMapping("/query")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<Paged<AppointmentResponse>> handle(@RequestBody @Valid AppointmentQueryRequest request) { return ApiResponse.ok(service.query(request)); }
}
