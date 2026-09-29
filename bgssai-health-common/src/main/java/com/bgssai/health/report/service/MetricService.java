package com.bgssai.health.report.service;
import com.bgssai.health.auth.service.CurrentAccount;
import com.bgssai.health.common.Checks;
import com.bgssai.health.invitation.service.InvitationService;
import com.bgssai.health.mapper.*;
import com.bgssai.health.model.*;
import com.bgssai.health.org.service.OrgService;
import com.bgssai.health.patient.service.PatientAccess;
import com.bgssai.health.patient.service.PatientService;
import com.bgssai.health.report.dto.*;
import com.github.pagehelper.PageHelper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;
/** Ten operations metrics, funnels, per-operator scorecard, daily summary and workbench queues. All counts come from the ledgers, none are stored. */
@Service
public class MetricService {
    private static final Logger log=LoggerFactory.getLogger(MetricService.class);
    public static final String DICTIONARY_VERSION="1.5";
    private static final int SAMPLE=5000;
    private static final List<String> ACTIVE_LIFECYCLES=List.of("ENROLLED","CONTACTED","BOOKED","ARRIVED","MANAGING","REVISIT_DUE","PAUSED","LOST");
    private final PatientMapper patients;private final CareTaskMapper tasks;private final InvitationMapper invitations;private final AppointmentMapper appointments;private final ServiceEnrollmentMapper enrollments;
    private final ScreeningRecordMapper screenings;private final MessageLogMapper messages;private final PatientAccess access;private final PatientService patientService;private final OrgService orgs;
    public MetricService(PatientMapper patients,CareTaskMapper tasks,InvitationMapper invitations,AppointmentMapper appointments,ServiceEnrollmentMapper enrollments,ScreeningRecordMapper screenings,MessageLogMapper messages,PatientAccess access,PatientService patientService,OrgService orgs){
        this.patients=patients;this.tasks=tasks;this.invitations=invitations;this.appointments=appointments;this.enrollments=enrollments;this.screenings=screenings;this.messages=messages;this.access=access;this.patientService=patientService;this.orgs=orgs;}
    public List<MetricDefinition> dictionary(){
        access.staff();return List.of(
            new MetricDefinition("MANAGED","应管理人数","区间末仍在管（lifecycle 不在 CLOSED/TRANSFERRED）的患者数","不计算","已结案、已转出",null,false),
            new MetricDefinition("REACH_RATE","有效触达率","区间内到期的首次联系任务中，有接通类邀约的去重患者数","区间内到期的首次联系任务去重患者数","已取消任务",95.0,false),
            new MetricDefinition("HIGH_RISK_TIMELY","高风险及时处理率","高/重点风险首次联系任务在 SLA 截止前完成","区间内到期的高/重点风险首次联系任务","已取消任务",95.0,false),
            new MetricDefinition("BOOKING_RATE","预约率","区间内新建预约的去重患者数","区间内有接通类邀约的去重患者数","无",60.0,false),
            new MetricDefinition("BOOKING_KEPT","预约履约率","预约时间落在区间内且到院（ARRIVED/COMPLETED）的预约数","预约时间落在区间内且未取消的预约数","已取消预约",50.0,false),
            new MetricDefinition("EFFECTIVE_ARRIVAL","有效到诊率","区间内到院且标记有效到诊的去重患者数","区间内被邀约的去重患者数","无",50.0,false),
            new MetricDefinition("ENROLL_RATE","入组率","区间内激活服务实例的去重患者数","区间内有效到诊的去重患者数","无",40.0,false),
            new MetricDefinition("FOLLOWUP_DONE","随访完成率","区间内到期且完成的随访任务","区间内到期且未取消的随访任务","已取消任务",90.0,false),
            new MetricDefinition("REVISIT_DONE","复诊复查完成率","区间内到期且到院或完成的复诊任务","区间内到期且未取消的复诊任务","已取消任务",75.0,false),
            new MetricDefinition("LOST_RATE","失访率","区间内置为失访的患者数","应管理人数","无",5.0,true));
    }
    public MetricReportResponse metrics(MetricQueryRequest req){
        log.info("metrics from={} to={} ownerId={}",req.fromDate(),req.toDate(),req.ownerId());access.staff();range(req);Window w=new Window(req);
        List<MetricValue> out=new ArrayList<>();
        PatientExample managed=access.scope();managed.in("lifecycle",ACTIVE_LIFECYCLES);if(req.ownerId()!=null)managed.eq("owner_id",req.ownerId());long managedCount=patients.countByExample(managed);
        out.add(metric("MANAGED",managedCount,null));
        List<CareTask> outreach=taskRows(w,"OUTREACH",req.ownerId());Set<Long> outreachPatients=outreach.stream().map(t->t.patientId).collect(Collectors.toSet());
        List<Invitation> invited=invitationRows(w,req.ownerId(),req.campaignId());Set<Long> reached=invited.stream().filter(i->!InvitationService.UNREACHED.contains(i.result)).map(i->i.patientId).collect(Collectors.toSet());
        Set<Long> invitedPatients=invited.stream().map(i->i.patientId).collect(Collectors.toSet());
        out.add(metric("REACH_RATE",outreachPatients.stream().filter(reached::contains).count(),(long)outreachPatients.size()));
        List<CareTask> urgent=outreach.stream().filter(t->List.of("P0","P1").contains(t.priority)).toList();
        out.add(metric("HIGH_RISK_TIMELY",urgent.stream().filter(t->"COMPLETED".equals(t.status)&&t.completedAt!=null&&t.slaDueAt!=null&&!t.completedAt.isAfter(t.slaDueAt)).count(),(long)urgent.size()));
        List<Appointment> bookedRows=appointmentRows(w,"gmt_create",req.ownerId());Set<Long> bookedPatients=bookedRows.stream().map(a->a.patientId).collect(Collectors.toSet());
        out.add(metric("BOOKING_RATE",bookedPatients.stream().filter(reached::contains).count(),(long)reached.size()));
        List<Appointment> due=appointmentRows(w,"appointment_at",req.ownerId()).stream().filter(a->!"CANCELLED".equals(a.status)).toList();
        out.add(metric("BOOKING_KEPT",due.stream().filter(a->List.of("ARRIVED","COMPLETED").contains(a.status)).count(),(long)due.size()));
        List<Appointment> arrivedRows=appointmentRows(w,"arrived_at",req.ownerId());Set<Long> effective=arrivedRows.stream().filter(a->!Boolean.FALSE.equals(a.effective)).map(a->a.patientId).collect(Collectors.toSet());
        out.add(metric("EFFECTIVE_ARRIVAL",(long)effective.size(),(long)invitedPatients.size()));
        Set<Long> activated=enrollmentRows(w,req.ownerId()).stream().map(e->e.patientId).collect(Collectors.toSet());
        out.add(metric("ENROLL_RATE",activated.stream().filter(effective::contains).count(),(long)effective.size()));
        List<CareTask> followups=taskRows(w,"FOLLOWUP",req.ownerId());out.add(metric("FOLLOWUP_DONE",followups.stream().filter(t->"COMPLETED".equals(t.status)).count(),(long)followups.size()));
        List<CareTask> revisits=taskRows(w,"REVISIT",req.ownerId());out.add(metric("REVISIT_DONE",revisits.stream().filter(t->List.of("ARRIVED","COMPLETED").contains(t.status)).count(),(long)revisits.size()));
        PatientExample lost=access.scope();lost.eq("lifecycle","LOST").ge("lost_since",w.from).lt("lost_since",w.to);if(req.ownerId()!=null)lost.eq("owner_id",req.ownerId());
        out.add(metric("LOST_RATE",patients.countByExample(lost),managedCount));
        return new MetricReportResponse(req.fromDate(),req.toDate(),out,DICTIONARY_VERSION,LocalDateTime.now());
    }
    public FunnelResponse funnel(MetricQueryRequest req){
        log.info("funnel from={} to={}",req.fromDate(),req.toDate());access.staff();range(req);Window w=new Window(req);
        List<ScreeningRecord> screened=screeningRows(w,req.campaignId());
        List<Invitation> invited=invitationRows(w,req.ownerId(),req.campaignId());
        List<Appointment> booked=appointmentRows(w,"gmt_create",req.ownerId());List<Appointment> arrived=appointmentRows(w,"arrived_at",req.ownerId());
        List<CareTask> followups=taskRows(w,"FOLLOWUP",req.ownerId());List<CareTask> revisits=taskRows(w,"REVISIT",req.ownerId());
        PatientExample enrolled=access.scope();enrolled.ge("gmt_create",w.from).lt("gmt_create",w.to);if(req.ownerId()!=null)enrolled.eq("owner_id",req.ownerId());
        List<CampaignFunnel> campaigns=new ArrayList<>();
        for(var c:orgs.campaigns(new com.bgssai.health.org.dto.CampaignQueryRequest(0,100,null,null)).items()){
            if(req.campaignId()!=null&&!req.campaignId().equals(c.id()))continue;
            List<ScreeningRecord> cs=screened.stream().filter(s->c.id().equals(s.campaignId)).toList();List<Invitation> ci=invited.stream().filter(i->c.id().equals(i.campaignId)).toList();
            Set<Long> ciPatients=ci.stream().map(i->i.patientId).collect(Collectors.toSet());
            campaigns.add(new CampaignFunnel(c.id(),c.name(),c.status(),c.targetCount(),cs.size(),cs.stream().filter(s->"HIGH_RISK".equals(s.poolStatus)||"ENROLLED".equals(s.poolStatus)&&List.of("HIGH","CRITICAL").contains(s.riskLevel)).count(),cs.stream().filter(s->"ENROLLED".equals(s.poolStatus)).count(),
                ci.stream().map(i->i.patientId).distinct().count(),ci.stream().filter(i->!InvitationService.UNREACHED.contains(i.result)).map(i->i.patientId).distinct().count(),ci.stream().filter(i->"WILLING".equals(i.result)).map(i->i.patientId).distinct().count(),
                booked.stream().filter(a->ciPatients.contains(a.patientId)).map(a->a.patientId).distinct().count(),arrived.stream().filter(a->ciPatients.contains(a.patientId)).map(a->a.patientId).distinct().count()));
        }
        return new FunnelResponse(req.fromDate(),req.toDate(),screened.size(),screened.stream().filter(s->"HIGH_RISK".equals(s.poolStatus)||"ENROLLED".equals(s.poolStatus)&&List.of("HIGH","CRITICAL").contains(s.riskLevel)).count(),patients.countByExample(enrolled),
            invited.stream().map(i->i.patientId).distinct().count(),invited.stream().filter(i->!InvitationService.UNREACHED.contains(i.result)).map(i->i.patientId).distinct().count(),invited.stream().filter(i->"WILLING".equals(i.result)).map(i->i.patientId).distinct().count(),
            booked.stream().map(a->a.patientId).distinct().count(),arrived.stream().map(a->a.patientId).distinct().count(),arrived.stream().filter(a->!Boolean.FALSE.equals(a.effective)).map(a->a.patientId).distinct().count(),
            enrollmentRows(w,req.ownerId()).stream().map(e->e.patientId).distinct().count(),followups.stream().filter(t->"COMPLETED".equals(t.status)).count(),revisits.stream().filter(t->List.of("ARRIVED","COMPLETED").contains(t.status)).count(),campaigns);
    }
    public List<OperatorMetric> operators(MetricQueryRequest req){
        log.info("operator metrics from={} to={}",req.fromDate(),req.toDate());access.staff();range(req);Window w=new Window(req);List<OperatorMetric> out=new ArrayList<>();
        for(var staff:patientService.staff()){
            if(req.ownerId()!=null&&!req.ownerId().equals(staff.userId()))continue;
            if("OPERATOR".equals(CurrentAccount.get().roleCode())&&!staff.userId().equals(CurrentAccount.get().userId()))continue;
            PatientExample mine=access.scope();mine.eq("owner_id",staff.userId()).in("lifecycle",ACTIVE_LIFECYCLES);long managed=patients.countByExample(mine);
            PatientExample high=access.scope();high.eq("owner_id",staff.userId()).in("lifecycle",ACTIVE_LIFECYCLES).in("risk_level",List.of("HIGH","CRITICAL"));
            PatientExample lost=access.scope();lost.eq("owner_id",staff.userId()).eq("lifecycle","LOST").ge("lost_since",w.from).lt("lost_since",w.to);
            List<Invitation> inv=invitationRows(w,staff.userId(),null);Set<Long> invitedPatients=inv.stream().map(i->i.patientId).collect(Collectors.toSet());Set<Long> reached=inv.stream().filter(i->!InvitationService.UNREACHED.contains(i.result)).map(i->i.patientId).collect(Collectors.toSet());
            List<Appointment> booked=appointmentRows(w,"gmt_create",staff.userId());List<Appointment> arrived=appointmentRows(w,"arrived_at",staff.userId());
            long effective=arrived.stream().filter(a->!Boolean.FALSE.equals(a.effective)).map(a->a.patientId).distinct().count();
            List<CareTask> followups=taskRows(w,"FOLLOWUP",staff.userId());long done=followups.stream().filter(t->"COMPLETED".equals(t.status)).count();
            CareTaskExample overdue=access.taskScope();overdue.eq("assignee_id",staff.userId()).ne("status","COMPLETED").ne("status","CANCELLED").lt("due_at",LocalDateTime.now());
            Double reachRate=rate(reached.size(),invitedPatients.size()),arrivalRate=rate(effective,reached.size()),followupRate=rate(done,followups.size());
            if(managed+inv.size()+followups.size()==0&&!staff.userId().equals(CurrentAccount.get().userId()))continue;
            out.add(new OperatorMetric(staff.userId(),staff.realName(),staff.roleCode(),managed,patients.countByExample(high),inv.size(),reached.size(),invitedPatients.size(),reachRate,booked.stream().map(a->a.patientId).distinct().count(),effective,arrivalRate,
                followups.size(),done,followupRate,tasks.countByExample(overdue),patients.countByExample(lost),rating(reachRate,arrivalRate)));
        }
        return out;
    }
    public DailySummaryResponse daily(DailyQueryRequest req){
        log.info("daily summary date={}",req.date());access.staff();Window w=new Window(req.date(),req.date());
        PatientExample np=access.scope();np.ge("gmt_create",w.from).lt("gmt_create",w.to);
        List<Invitation> inv=invitationRows(w,null,null);List<CareTask> followups=taskRows(w,"FOLLOWUP",null);
        CareTaskExample opened=access.taskScope();opened.eq("task_type","ALERT").ge("gmt_create",w.from).lt("gmt_create",w.to);
        CareTaskExample closed=access.taskScope();closed.eq("task_type","ALERT").eq("status","COMPLETED").ge("completed_at",w.from).lt("completed_at",w.to);
        MessageLogExample ml=new MessageLogExample();ml.eq("hospital_id",CurrentAccount.get().hospitalId()).ge("sent_at",w.from).lt("sent_at",w.to);if("OPERATOR".equals(CurrentAccount.get().roleCode()))ml.eq("actor_id",CurrentAccount.get().userId());
        CareTaskExample overdue=access.taskScope();overdue.ne("status","COMPLETED").ne("status","CANCELLED").lt("due_at",w.to);
        ScreeningRecordExample sx=new ScreeningRecordExample();sx.eq("hospital_id",CurrentAccount.get().hospitalId()).ge("gmt_create",w.from).lt("gmt_create",w.to);
        return new DailySummaryResponse(req.date(),screenings.countByExample(sx),patients.countByExample(np),inv.size(),inv.stream().filter(i->!InvitationService.UNREACHED.contains(i.result)).count(),
            appointmentRows(w,"gmt_create",null).size(),appointmentRows(w,"arrived_at",null).size(),followups.size(),followups.stream().filter(t->"COMPLETED".equals(t.status)).count(),
            tasks.countByExample(opened),tasks.countByExample(closed),messages.countByExample(ml),enrollmentRows(w,null).size(),tasks.countByExample(overdue));
    }
    public WorkbenchResponse workbench(){
        log.info("workbench accountId={}",CurrentAccount.get().userId());access.staff();LocalDateTime now=LocalDateTime.now();LocalDateTime dayStart=LocalDate.now().atStartOfDay(),dayEnd=dayStart.plusDays(1);
        List<QueueItem> q=new ArrayList<>();
        CareTaskExample outreach=open();outreach.eq("task_type","OUTREACH").lt("due_at",dayEnd);q.add(new QueueItem("OUTREACH_TODAY","今日待触达",tasks.countByExample(outreach),"/followups?task_type=OUTREACH"));
        CareTaskExample sla=open();sla.in("priority",List.of("P0","P1")).lt("sla_due_at",now).isNull("ack_at");q.add(new QueueItem("SLA_OVERDUE","超 SLA 高危",tasks.countByExample(sla),"/alerts?sla_overdue=true"));
        CareTaskExample today=open();today.eq("task_type","FOLLOWUP").ge("due_at",dayStart).lt("due_at",dayEnd);q.add(new QueueItem("FOLLOWUP_TODAY","今日随访",tasks.countByExample(today),"/followups?due=today"));
        CareTaskExample retry=open();retry.in("contact_result",com.bgssai.health.task.service.TaskService.FAILED_CONTACT).lt("next_contact_at",dayEnd);q.add(new QueueItem("RETRY_CONTACT","待再次联系",tasks.countByExample(retry),"/followups?contact_pending=true"));
        AppointmentExample remind=new AppointmentExample();remind.eq("hospital_id",CurrentAccount.get().hospitalId()).eq("status","BOOKED").ge("appointment_at",dayEnd).lt("appointment_at",dayEnd.plusDays(1));scopeAppointments(remind);q.add(new QueueItem("REMIND_TOMORROW","明日到诊提醒",appointments.countByExample(remind),"/appointments?remind=tomorrow"));
        CareTaskExample revisit=open();revisit.eq("task_type","REVISIT").lt("due_at",dayStart.plusDays(7));q.add(new QueueItem("REVISIT_7D","7 天内待复诊",tasks.countByExample(revisit),"/revisits"));
        CareTaskExample handover=access.taskScope();handover.eq("status","COMPLETED").eq("handover_status","PENDING");CareTaskExample review=access.taskScope();review.eq("status","PENDING_REVIEW");q.add(new QueueItem("HOSPITAL_PENDING","待院方确认",tasks.countByExample(handover)+tasks.countByExample(review),"/followups?handover_pending=true"));
        CareTaskExample lost=open();lost.eq("task_type","ALERT").eq("alert_source","LOST_CONTACT");q.add(new QueueItem("LOST_CONFIRM","失联待确认",tasks.countByExample(lost),"/alerts?alert_source=LOST_CONTACT"));
        return new WorkbenchResponse(now,q);
    }
    private CareTaskExample open(){CareTaskExample ex=access.taskScope();ex.ne("status","COMPLETED").ne("status","CANCELLED");return ex;}
    private void scopeAppointments(AppointmentExample ex){if("OPERATOR".equals(CurrentAccount.get().roleCode())){PatientExample scope=access.scope();scope.selectColumns("id");PageHelper.startPage(1,SAMPLE,false);ex.in("patient_id",patients.selectByExample(scope).stream().map(p->p.id).toList());}}
    private static void range(MetricQueryRequest req){Checks.require(!req.toDate().isBefore(req.fromDate())&&ChronoUnit.DAYS.between(req.fromDate(),req.toDate())<=366,"Choose up to one year / 请选择不超过一年的区间");}
    private record Window(LocalDateTime from,LocalDateTime to){Window(MetricQueryRequest r){this(r.fromDate(),r.toDate());}Window(LocalDate f,LocalDate t){this(f.atStartOfDay(),t.plusDays(1).atStartOfDay());}}
    private List<CareTask> taskRows(Window w,String type,Long assigneeId){CareTaskExample ex=access.taskScope();ex.eq("task_type",type).ge("due_at",w.from).lt("due_at",w.to).ne("status","CANCELLED");if(assigneeId!=null)ex.eq("assignee_id",assigneeId);ex.selectColumns("id","patient_id","status","priority","completed_at","sla_due_at");PageHelper.startPage(1,SAMPLE,false);return tasks.selectByExample(ex);}
    private List<Invitation> invitationRows(Window w,Long actorId,Long campaignId){InvitationExample ex=new InvitationExample();ex.eq("hospital_id",CurrentAccount.get().hospitalId()).ge("invited_at",w.from).lt("invited_at",w.to);if(actorId!=null)ex.eq("actor_id",actorId);else if("OPERATOR".equals(CurrentAccount.get().roleCode()))ex.eq("actor_id",CurrentAccount.get().userId());if(campaignId!=null)ex.eq("campaign_id",campaignId);ex.selectColumns("id","patient_id","result","campaign_id","actor_id");PageHelper.startPage(1,SAMPLE,false);return invitations.selectByExample(ex);}
    private List<Appointment> appointmentRows(Window w,String column,Long actorId){AppointmentExample ex=new AppointmentExample();ex.eq("hospital_id",CurrentAccount.get().hospitalId()).ge(column,w.from).lt(column,w.to);if(actorId!=null)ex.eq("actor_id",actorId);else scopeAppointments(ex);ex.selectColumns("id","patient_id","status","is_effective","actor_id");PageHelper.startPage(1,SAMPLE,false);return appointments.selectByExample(ex);}
    private List<ServiceEnrollment> enrollmentRows(Window w,Long actorId){ServiceEnrollmentExample ex=new ServiceEnrollmentExample();ex.eq("hospital_id",CurrentAccount.get().hospitalId()).ge("activated_at",w.from).lt("activated_at",w.to);if(actorId!=null)ex.eq("activated_by",actorId);ex.selectColumns("id","patient_id");PageHelper.startPage(1,SAMPLE,false);return enrollments.selectByExample(ex);}
    private List<ScreeningRecord> screeningRows(Window w,Long campaignId){ScreeningRecordExample ex=new ScreeningRecordExample();ex.eq("hospital_id",CurrentAccount.get().hospitalId()).ge("screened_at",w.from).lt("screened_at",w.to);if(campaignId!=null)ex.eq("campaign_id",campaignId);ex.selectColumns("id","pool_status","risk_level","campaign_id");PageHelper.startPage(1,SAMPLE,false);return screenings.selectByExample(ex);}
    private MetricValue metric(String code,long numerator,Long denominator){
        MetricDefinition d=dictionary().stream().filter(x->x.code().equals(code)).findFirst().orElseThrow();Double r=denominator==null?null:rate(numerator,denominator);
        Boolean met=r==null||d.target()==null?null:d.lowerIsBetter()?r<=d.target():r>=d.target();return new MetricValue(code,d.name(),numerator,denominator,r,d.target(),met,d.lowerIsBetter());
    }
    private static String rating(Double reach,Double arrival){
        double r=reach==null?0:reach,a=arrival==null?0:arrival;
        if(r>=90&&a>=60)return "优秀";if(r>=80&&a>=50)return "良好";if(r>=70&&a>=40)return "合格";return "待改进";
    }
    private static Double rate(long numerator,long denominator){return denominator==0?null:Math.round(numerator*1000.0/denominator)/10.0;}
}
