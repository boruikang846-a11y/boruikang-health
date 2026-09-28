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
import org.springframework.transaction.annotation.Transactional;
import com.bgssai.health.audit.service.AuditService;
import com.bgssai.health.common.Paged;
import com.bgssai.health.common.dto.PageRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.pagehelper.PageHelper;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
@Service
public class ReportService {
    private static final Logger log=LoggerFactory.getLogger(ReportService.class);
    private final PatientMapper patients;private final CareTaskMapper tasks;private final PatientAccess access;private final PatientService patientService;private final OperationsReportMapper archives;private final AuditService audit;private final ObjectMapper json;
    public ReportService(PatientMapper patients,CareTaskMapper tasks,PatientAccess access,PatientService patientService,OperationsReportMapper archives,AuditService audit,ObjectMapper json){this.patients=patients;this.tasks=tasks;this.access=access;this.patientService=patientService;this.archives=archives;this.audit=audit;this.json=json;}
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
        List<NurseMetric> nurses=new ArrayList<>();
        for(var nurse:patientService.staff())if(List.of("NURSE","OPERATOR","MANAGER").contains(nurse.roleCode())) {
            CareTaskExample nd=cohort(req.fromDate(),req.toDate(),"FOLLOWUP");nd.eq("assignee_id",nurse.userId());
            CareTaskExample nc=cohort(req.fromDate(),req.toDate(),"FOLLOWUP");nc.eq("assignee_id",nurse.userId()).eq("status","COMPLETED");
            CareTaskExample no=cohort(req.fromDate(),req.toDate(),"FOLLOWUP");no.eq("assignee_id",nurse.userId()).eq("status","COMPLETED").leColumn("completed_at","due_at");
            CareTaskExample late=active();late.eq("task_type","FOLLOWUP").eq("assignee_id",nurse.userId()).lt("due_at",LocalDateTime.now());
            CareTaskExample waiting=contactPending();waiting.eq("assignee_id",nurse.userId());
            long nDue=tasks.countByExample(nd),nDone=tasks.countByExample(nc),nTime=tasks.countByExample(no),nLate=tasks.countByExample(late),nWait=tasks.countByExample(waiting);
            if(nDue+nLate+nWait>0||nurse.userId().equals(CurrentAccount.get().userId()))nurses.add(new NurseMetric(nurse.userId(),nurse.realName(),nurse.roleCode(),nDue,nDone,nTime,rate(nDone,nDue),rate(nTime,nDue),nLate,nWait));
        }
        CareTaskExample yesterday=cohort(LocalDate.now().minusDays(1),LocalDate.now().minusDays(1),"REVISIT");yesterday.in("status",List.of("PENDING","BOOKED","NO_SHOW"));
        return new WeeklyReportResponse(req.fromDate(),req.toDate(),patients.countByExample(access.scope()),d,c,o,rate(c,d),rate(o,d),a,cl,rate(cl,a),r,ar,rate(ar,r),doctors,LocalDateTime.now(),"NOT_SENT",nurses,tasks.countByExample(contactPending()),tasks.countByExample(yesterday));
    }
    private CareTaskExample contactPending(){CareTaskExample ex=active();ex.eq("task_type","FOLLOWUP").in("contact_result",List.of("NO_ANSWER","BUSY","WRONG_NUMBER","REFUSED","IDENTITY_UNVERIFIED"));return ex;}
    @Transactional
    public ArchivedReportResponse archive(ArchiveReportRequest req) {
        access.staff();Checks.require(List.of("DAILY","WEEKLY").contains(req.reportType()),"Invalid archive type");
        Checks.require(!req.toDate().isAfter(LocalDate.now()),"Only archive periods ending today or earlier");
        Checks.require("DAILY".equals(req.reportType())?req.fromDate().equals(req.toDate()):ChronoUnit.DAYS.between(req.fromDate(),req.toDate())<=6,"Daily archive covers one day; weekly review covers up to seven days");
        WeeklyReportResponse snapshot=weekly(new WeeklyReportRequest(req.fromDate(),req.toDate()));
        OperationsReport row=new OperationsReport();row.hospitalId=CurrentAccount.get().hospitalId();row.ownerId=CurrentAccount.get().userId();row.reportType=req.reportType();
        row.fromDate=req.fromDate();row.toDate=req.toDate();row.summary=req.summary();row.actionPlan=req.actionPlan();row.version=0;row.creator=row.ownerId.toString();
        try {row.snapshotJson=json.writeValueAsString(snapshot);}catch(com.fasterxml.jackson.core.JsonProcessingException e){throw new IllegalStateException("Unable to archive report",e);}
        archives.insertSelective(row);audit.append(null,"REPORT_ARCHIVED",row.id,null,req.reportType(),"Immutable report snapshot");return archivedView(archives.selectByPrimaryKey(row.id));
    }
    public Paged<ArchivedReportResponse> archives(PageRequest req) {
        access.staff();OperationsReportExample ex=new OperationsReportExample();ex.eq("hospital_id",CurrentAccount.get().hospitalId());
        if(!"MANAGER".equals(CurrentAccount.get().roleCode()))ex.eq("owner_id",CurrentAccount.get().userId());
        PageHelper.startPage(Paged.number(req.page()),Paged.size(req.size()));List<OperationsReport> rows=archives.selectByExample(ex);return Paged.of(rows,this::archivedView);
    }
    @Transactional
    public ArchivedReportResponse deliver(DeliverReportRequest req) {
        access.staff();OperationsReport row=archives.selectByPrimaryKey(req.id());Checks.found(row!=null&&row.hospitalId.equals(CurrentAccount.get().hospitalId()));
        Checks.found("MANAGER".equals(CurrentAccount.get().roleCode())||row.ownerId.equals(CurrentAccount.get().userId()));
        Checks.conflict(row.version.equals(req.version())&&row.deliveredAt==null);
        Checks.require(req.deliveredAt()!=null&&!req.deliveredAt().isAfter(LocalDateTime.now())&&!req.deliveredAt().isBefore(row.gmtCreate),"Enter actual delivery time after this archive was created");
        Checks.require(Checks.text(req.evidence()),"Record actual external delivery evidence; this operation sends nothing");
        OperationsReport patch=new OperationsReport();patch.deliveryEvidence=req.evidence();patch.deliveredAt=req.deliveredAt();patch.version=row.version+1;patch.modifier=CurrentAccount.get().userId().toString();
        OperationsReportExample ex=new OperationsReportExample();ex.eq("id",row.id).eq("hospital_id",row.hospitalId).eq("version",row.version);Checks.conflict(archives.updateByExampleSelective(patch,ex)==1);
        audit.append(null,"REPORT_MANUAL_DELIVERY_RECORDED",row.id,null,"MANUAL_DELIVERY", "Evidence recorded; no system message sent");return archivedView(archives.selectByPrimaryKey(row.id));
    }
    private ArchivedReportResponse archivedView(OperationsReport r) {
        try {return new ArchivedReportResponse(r.id,r.ownerId,r.reportType,r.fromDate,r.toDate,r.summary,r.actionPlan,json.readValue(r.snapshotJson,WeeklyReportResponse.class),r.deliveryEvidence,r.deliveredAt,r.version,r.gmtCreate);}
        catch(com.fasterxml.jackson.core.JsonProcessingException e){throw new IllegalStateException("Invalid report snapshot",e);}
    }
    private CareTaskExample active(){CareTaskExample ex=access.taskScope();ex.ne("status","COMPLETED").ne("status","CANCELLED");return ex;}
    private CareTaskExample cohort(LocalDate from,LocalDate to,String type){CareTaskExample ex=access.taskScope();ex.eq("task_type",type).ge("due_at",from.atStartOfDay()).lt("due_at",to.plusDays(1).atStartOfDay()).ne("status","CANCELLED");return ex;}
    private static Double rate(long numerator,long denominator){return denominator==0?null:Math.round(numerator*1000.0/denominator)/10.0;}
}
