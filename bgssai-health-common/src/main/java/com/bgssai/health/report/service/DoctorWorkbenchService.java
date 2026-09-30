package com.bgssai.health.report.service;
import com.bgssai.health.auth.service.CurrentAccount;
import com.bgssai.health.mapper.CareTaskMapper;
import com.bgssai.health.mapper.PatientMapper;
import com.bgssai.health.model.*;
import com.bgssai.health.patient.service.PatientAccess;
import com.bgssai.health.record.service.RecordService;
import com.bgssai.health.report.dto.DoctorWorkbenchResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
/** The responsible doctor's four queues: advice to review, reports to read, results to receive, escalated alerts. */
@Service
public class DoctorWorkbenchService {
    private static final Logger log=LoggerFactory.getLogger(DoctorWorkbenchService.class);
    private final PatientMapper patients;private final CareTaskMapper tasks;private final PatientAccess access;private final RecordService records;
    public DoctorWorkbenchService(PatientMapper patients,CareTaskMapper tasks,PatientAccess access,RecordService records){this.patients=patients;this.tasks=tasks;this.access=access;this.records=records;}
    public DoctorWorkbenchResponse workbench(){
        log.info("doctor workbench accountId={}",CurrentAccount.get().userId());access.doctor();
        PatientExample high=access.scope();high.in("risk_level",List.of("HIGH","CRITICAL"));
        CareTaskExample review=access.taskScope();review.eq("status","PENDING_REVIEW");
        CareTaskExample results=access.taskScope();results.eq("task_type","FOLLOWUP").eq("status","COMPLETED").eq("handover_status","PENDING");
        CareTaskExample alerts=access.taskScope();alerts.eq("task_type","ALERT").eq("status","ESCALATED");
        return new DoctorWorkbenchResponse(patients.countByExample(access.scope()),patients.countByExample(high),tasks.countByExample(review),
            records.unreadReports(),tasks.countByExample(results),tasks.countByExample(alerts),LocalDateTime.now());
    }
}
