package com.bgssai.health.report.service;
import com.bgssai.health.auth.service.CurrentAccount;
import com.bgssai.health.common.Checks;
import com.bgssai.health.mapper.*;
import com.bgssai.health.model.*;
import com.bgssai.health.patient.service.PatientAccess;
import com.bgssai.health.patient.service.PatientService;
import com.bgssai.health.report.dto.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
@Service
public class ReportService {
    private static final Logger log=LoggerFactory.getLogger(ReportService.class);
    private final PatientMapper patients;private final CareTaskMapper tasks;private final PatientAccess access;private final PatientService patientService;
    public ReportService(PatientMapper patients,CareTaskMapper tasks,PatientAccess access,PatientService patientService){this.patients=patients;this.tasks=tasks;this.access=access;this.patientService=patientService;}
    public DashboardResponse dashboard(){
        log.info("dashboard accountId={}",CurrentAccount.get().userId());access.staff();
        long patientCount=patients.countByExample(access.scope());PatientExample managing=access.scope();managing.eq("lifecycle","MANAGING");
        PatientExample risk=access.scope();risk.in("risk_level",List.of("HIGH","CRITICAL"));
        CareTaskExample pending=active();CareTaskExample overdue=active();overdue.lt("due_at",LocalDateTime.now());
        CareTaskExample review=access.taskScope();review.eq("status","PENDING_REVIEW");
        CareTaskExample alert=active();alert.eq("task_type","ALERT");CareTaskExample revisit=active();revisit.eq("task_type","REVISIT");
        List<DailyMetric> daily=new ArrayList<>();
        for(int day=6;day>=0;day--){LocalDate date=LocalDate.now().minusDays(day);CareTaskExample due=cohort(date,date,"FOLLOWUP");CareTaskExample done=cohort(date,date,"FOLLOWUP");done.eq("status","COMPLETED");daily.add(new DailyMetric(date,tasks.countByExample(due),tasks.countByExample(done)));}
        return new DashboardResponse(patientCount,patients.countByExample(managing),patients.countByExample(risk),tasks.countByExample(pending),tasks.countByExample(overdue),tasks.countByExample(review),tasks.countByExample(alert),tasks.countByExample(revisit),daily,LocalDateTime.now());
    }
    public WeeklyReportResponse weekly(WeeklyReportRequest req){
        log.info("weekly report from={} to={}",req.fromDate(),req.toDate());access.staff();
        Checks.require(!req.toDate().isBefore(req.fromDate())&&ChronoUnit.DAYS.between(req.fromDate(),req.toDate())<=92,"Choose up to 93 days / 请选择不超过93天的时间范围");
        CareTaskExample due=cohort(req.fromDate(),req.toDate(),"FOLLOWUP"),done=cohort(req.fromDate(),req.toDate(),"FOLLOWUP"),onTime=cohort(req.fromDate(),req.toDate(),"FOLLOWUP");
        done.eq("status","COMPLETED");onTime.eq("status","COMPLETED").leColumn("completed_at","due_at");
        CareTaskExample alerts=cohort(req.fromDate(),req.toDate(),"ALERT"),closed=cohort(req.fromDate(),req.toDate(),"ALERT");closed.eq("status","COMPLETED");
        CareTaskExample revisits=cohort(req.fromDate(),req.toDate(),"REVISIT"),arrived=cohort(req.fromDate(),req.toDate(),"REVISIT");arrived.in("status",List.of("ARRIVED","COMPLETED"));
        long d=tasks.countByExample(due),c=tasks.countByExample(done),o=tasks.countByExample(onTime),a=tasks.countByExample(alerts),cl=tasks.countByExample(closed),r=tasks.countByExample(revisits),ar=tasks.countByExample(arrived);
        List<DoctorMetric> doctors=new ArrayList<>();
        for(var doctor:patientService.staff())if("DOCTOR".equals(doctor.roleCode())){
            PatientExample px=access.scope();px.eq("doctor_id",doctor.userId());CareTaskExample dx=cohort(req.fromDate(),req.toDate(),"FOLLOWUP");dx.eq("doctor_id",doctor.userId());
            CareTaskExample cx=cohort(req.fromDate(),req.toDate(),"FOLLOWUP");cx.eq("doctor_id",doctor.userId()).eq("status","COMPLETED");CareTaskExample ax=active();ax.eq("doctor_id",doctor.userId()).eq("task_type","ALERT");
            long count=patients.countByExample(px);if(count>0)doctors.add(new DoctorMetric(doctor.userId(),doctor.realName(),count,tasks.countByExample(dx),tasks.countByExample(cx),tasks.countByExample(ax)));
        }
        return new WeeklyReportResponse(req.fromDate(),req.toDate(),patients.countByExample(access.scope()),d,c,o,rate(c,d),rate(o,d),a,cl,rate(cl,a),r,ar,rate(ar,r),doctors,LocalDateTime.now(),"NOT_SENT");
    }
    private CareTaskExample active(){CareTaskExample ex=access.taskScope();ex.ne("status","COMPLETED").ne("status","CANCELLED");return ex;}
    private CareTaskExample cohort(LocalDate from,LocalDate to,String type){CareTaskExample ex=access.taskScope();ex.eq("task_type",type).ge("due_at",from.atStartOfDay()).lt("due_at",to.plusDays(1).atStartOfDay()).ne("status","CANCELLED");return ex;}
    private static Double rate(long numerator,long denominator){return denominator==0?null:Math.round(numerator*1000.0/denominator)/10.0;}
}
