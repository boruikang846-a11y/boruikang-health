package com.bgssai.health.admin.patient.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.patient.dto.*;
import com.bgssai.health.patient.service.PatientFileImportService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
@RestController
@RequestMapping("/bgssai/admin/patients")
@NeedAop
public class ImportPatientFileController {
 private final PatientFileImportService service;
 public ImportPatientFileController(PatientFileImportService service){this.service=service;}
 @PostMapping(value="/import_file",consumes="multipart/form-data")
 @RateLimit(capacity=20,refillPerMinute=20)
 public ApiResponse<ImportPatientsResponse> handle(@RequestPart("settings") @Valid ImportPatientFileRequest settings,@RequestPart("file") MultipartFile file){return ApiResponse.ok(service.upload(settings,file));}
}
