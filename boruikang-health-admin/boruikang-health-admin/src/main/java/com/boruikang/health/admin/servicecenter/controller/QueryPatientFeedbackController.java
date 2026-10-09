package com.boruikang.health.admin.servicecenter.controller;
import com.boruikang.health.common.*;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.servicecenter.dto.*;
import com.boruikang.health.servicecenter.service.PatientServiceCenter;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController @NeedAop @RequestMapping("/boruikang/admin/service_center")
public class QueryPatientFeedbackController {
 private final PatientServiceCenter service;
 public QueryPatientFeedbackController(PatientServiceCenter service){this.service=service;}
 @PostMapping("/feedback_query") public ApiResponse<java.util.List<ServiceFeedbackResponse>> handle(@RequestBody @Valid com.boruikang.health.continuity.dto.ContinuousCareQueryRequest req){return ApiResponse.ok(service.feedbackQuery(req));}
}
