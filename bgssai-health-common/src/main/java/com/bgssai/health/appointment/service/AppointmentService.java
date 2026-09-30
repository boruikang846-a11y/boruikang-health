package com.bgssai.health.appointment.service;
import com.bgssai.health.appointment.dto.*;
import com.bgssai.health.audit.service.AuditService;
import com.bgssai.health.auth.service.CurrentAccount;
import com.bgssai.health.common.*;
import com.bgssai.health.mapper.*;
import com.bgssai.health.model.*;
import com.bgssai.health.patient.service.PatientAccess;
import com.bgssai.health.patient.service.PatientService;
import com.bgssai.health.task.service.TaskWriter;
import com.github.pagehelper.PageHelper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
/** Structured booking and arrival ledger; every appointment is mirrored by a REVISIT task so queues and metrics stay single-sourced. */
@Service
public class AppointmentService {
    private static final Logger log=LoggerFactory.getLogger(AppointmentService.class);
    private static final List<String> OPEN=List.of("BOOKED","REMINDED");
    private final AppointmentMapper appointments;private final CareTaskMapper tasks;private final PatientMapper patients;private final InvitationMapper invitations;private final ReferralMapper referrals;
    private final PatientAccess access;private final AuditService audit;private final PatientService patientService;private final TaskWriter writer;
    public AppointmentService(AppointmentMapper appointments,CareTaskMapper tasks,PatientMapper patients,InvitationMapper invitations,ReferralMapper referrals,PatientAccess access,AuditService audit,PatientService patientService,TaskWriter writer){
        this.appointments=appointments;this.tasks=tasks;this.patients=patients;this.invitations=invitations;this.referrals=referrals;this.access=access;this.audit=audit;this.patientService=patientService;this.writer=writer;}
    public Paged<AppointmentResponse> query(AppointmentQueryRequest req){
        log.info("query appointments status={} from={}",req.status(),req.from());access.staff();var actor=CurrentAccount.get();
        AppointmentExample ex=new AppointmentExample();ex.eq("hospital_id",actor.hospitalId());
        if(req.patientId()!=null){access.require(req.patientId());ex.eq("patient_id",req.patientId());}
        else {access.operations();if(access.executor())ex.in("patient_id",access.scopedPatientIds(2000));}
        if(Checks.text(req.status()))ex.eq("status",req.status());
        if(Boolean.TRUE.equals(req.open()))ex.in("status",OPEN);
        if(Checks.text(req.appointmentType()))ex.eq("appointment_type",req.appointmentType());
        if(Checks.text(req.channel()))ex.eq("channel",req.channel());
        if(req.clinicianId()!=null)ex.eq("clinician_id",req.clinicianId());
        if(Checks.text(req.department()))ex.eq("department",req.department());
        if(req.from()!=null)ex.ge("appointment_at",req.from().atStartOfDay());
        if(req.to()!=null)ex.lt("appointment_at",req.to().plusDays(1).atStartOfDay());
        ex.setOrderByClause("appointment_at ASC,id ASC");
        PageHelper.startPage(Paged.number(req.page()),Paged.size(req.size()));
        List<Appointment> rows=appointments.selectByExample(ex);Map<Long,Patient> names=names(rows.stream().map(r->r.patientId).distinct().toList());
        return Paged.of(rows,r->view(r,names.get(r.patientId)));
    }
    @Transactional
    public AppointmentResponse create(CreateAppointmentRequest req){
        log.info("create appointment patientId={} type={}",req.patientId(),req.appointmentType());access.operations();Patient p=access.lock(req.patientId());
        Appointment existing=byKey(p.hospitalId,req.requestKey());if(existing!=null){Checks.conflict(p.id.equals(existing.patientId));return view(existing,p);}
        Checks.require(!List.of("CLOSED","TRANSFERRED","PAUSED").contains(p.lifecycle),"Patient is not under active management / 患者已暂停、转出或结案");
        Checks.require(req.appointmentAt().isAfter(LocalDateTime.now().minusDays(1))&&req.appointmentAt().isBefore(LocalDateTime.now().plusYears(1)),"Appointment time must be within the coming year / 预约时间需在未来一年内");
        patientService.validateClinician(req.clinicianId());
        if(req.invitationId()!=null){Invitation i=invitations.selectByPrimaryKey(req.invitationId());Checks.require(i!=null&&p.id.equals(i.patientId),"Invitation must belong to this patient / 邀约记录与患者不符");}
        if(req.referralId()!=null){Referral r=referrals.selectByPrimaryKey(req.referralId());Checks.require(r!=null&&p.id.equals(r.patientId),"Referral must belong to this patient / 转诊记录与患者不符");}
        AppointmentExample openEx=new AppointmentExample();openEx.eq("hospital_id",p.hospitalId).eq("patient_id",p.id).in("status",OPEN);
        Checks.require(appointments.countByExample(openEx)==0,"Patient already has an open appointment; close it first / 患者已有未完成预约，请先处理");
        Appointment a=new Appointment();a.hospitalId=p.hospitalId;a.patientId=p.id;a.invitationId=req.invitationId();a.referralId=req.referralId();a.appointmentType=req.appointmentType();a.channel=req.channel();
        a.appointmentAt=req.appointmentAt();a.department=req.department().trim();a.clinicianId=req.clinicianId();a.status="BOOKED";a.evidence=req.evidence().trim();a.actorId=CurrentAccount.get().userId();a.requestKey=req.requestKey();a.version=0;a.creator=a.actorId.toString();
        CareTask task;
        if(req.taskId()!=null){
            task=tasks.selectByPrimaryKey(req.taskId());Checks.require(task!=null&&p.id.equals(task.patientId)&&"REVISIT".equals(task.taskType)&&List.of("PENDING","NO_SHOW").contains(task.status),"Select an open revisit task of this patient / 请选择该患者待预约的复诊任务");
        } else {
            task=new CareTask();task.hospitalId=p.hospitalId;task.patientId=p.id;task.taskType="REVISIT";task.title=title(req.appointmentType())+"："+a.department;task.priority=List.of("HIGH","CRITICAL").contains(p.riskLevel)?"P1":"P2";
            task.status="PENDING";task.assigneeId=p.ownerId;task.doctorId=p.doctorId;task.dueAt=req.appointmentAt();task.requestKey="appointment-"+req.requestKey();task.version=0;task.creator=a.creator;
            tasks.insertSelective(task);task=tasks.selectByPrimaryKey(task.id);audit.append(p.id,"TASK_CREATED",task.id,null,"PENDING","REVISIT for appointment");
        }
        a.taskId=task.id;appointments.insertSelective(a);
        CareTask patch=new CareTask();patch.status="BOOKED";patch.appointmentId=a.id;patch.dueAt=req.appointmentAt();patch.evidence=req.evidence().trim();writer.save(task,patch,"TASK_BOOK");
        patientService.advance(p,"BOOKED","Appointment "+a.id+" booked");
        audit.append(p.id,"APPOINTMENT_BOOKED",a.id,null,"BOOKED",req.appointmentType()+" via "+req.channel());return view(appointments.selectByPrimaryKey(a.id),p);
    }
    @Transactional
    public AppointmentResponse transition(TransitionAppointmentRequest req){
        log.info("transition appointment id={} action={}",req.id(),req.action());access.operations();Appointment a=appointments.selectByPrimaryKey(req.id());
        Checks.found(a!=null&&CurrentAccount.get().hospitalId().equals(a.hospitalId));Patient p=access.lock(a.patientId);Checks.conflict(req.version().equals(a.version));
        LocalDateTime at=req.at()==null?LocalDateTime.now():req.at();CareTask task=a.taskId==null?null:tasks.selectByPrimaryKey(a.taskId);CareTask taskPatch=new CareTask();
        Appointment patch=new Appointment();String taskAction=null;
        switch(req.action()){
            case "REMIND"->{Checks.conflict("BOOKED".equals(a.status));Checks.require(Checks.text(req.evidence()),"Record how the reminder was sent / 请记录提醒方式与凭证");patch.status="REMINDED";patch.reminderSentAt=at;taskPatch.reminderSentAt=at;}
            case "ARRIVE"->{Checks.conflict(OPEN.contains(a.status));Checks.require(Checks.text(req.evidence()),"Arrival evidence required / 请填写到院核验证据");patch.status="ARRIVED";patch.arrivedAt=at;patch.effective=!Boolean.FALSE.equals(req.effective());taskPatch.status="ARRIVED";taskPatch.evidence=req.evidence();taskAction="TASK_ARRIVE";}
            case "NO_SHOW"->{Checks.conflict(OPEN.contains(a.status));Checks.require(Checks.text(req.noShowReason()),"No-show reason required / 请选择未到院原因");patch.status="NO_SHOW";patch.noShowReason=req.noShowReason();patch.outcomeNote=req.outcomeNote();taskPatch.status="NO_SHOW";taskPatch.outcome="未到院："+req.noShowReason();taskAction="TASK_NO_SHOW";}
            case "CANCEL"->{Checks.conflict(OPEN.contains(a.status));Checks.require(Checks.text(req.outcomeNote()),"Cancellation reason required / 请填写取消原因");patch.status="CANCELLED";patch.outcomeNote=req.outcomeNote();taskPatch.status="PENDING";taskPatch.outcome="预约取消："+req.outcomeNote();taskAction="TASK_BOOKING_CANCELLED";}
            case "COMPLETE"->{Checks.conflict("ARRIVED".equals(a.status));Checks.require(Checks.text(req.outcome()),"Visit outcome required / 请记录到院结果");patch.status="COMPLETED";patch.outcome=req.outcome();patch.outcomeNote=req.outcomeNote();taskPatch.status="COMPLETED";taskPatch.completedAt=at;taskPatch.outcome=req.outcome()+(Checks.text(req.outcomeNote())?"："+req.outcomeNote():"");taskAction="TASK_COMPLETE";}
            default->throw new IllegalArgumentException("Unknown action");
        }
        if(Checks.text(req.evidence()))patch.evidence=req.evidence().trim();
        patch.version=a.version+1;patch.modifier=CurrentAccount.get().userId().toString();
        AppointmentExample ex=new AppointmentExample();ex.eq("id",a.id).eq("hospital_id",a.hospitalId).eq("version",a.version);Checks.conflict(appointments.updateByExampleSelective(patch,ex)==1);
        if(task!=null&&!List.of("COMPLETED","CANCELLED").contains(task.status)){
            if(taskAction==null){taskPatch.version=task.version+1;taskPatch.modifier=patch.modifier;CareTaskExample tx=new CareTaskExample();tx.eq("id",task.id).eq("version",task.version);tasks.updateByExampleSelective(taskPatch,tx);}
            else writer.save(task,taskPatch,taskAction);
        }
        if("ARRIVE".equals(req.action()))patientService.advance(p,"ARRIVED","Appointment "+a.id+" arrived");
        audit.append(p.id,"APPOINTMENT_"+req.action(),a.id,a.status,patch.status,Checks.text(req.noShowReason())?req.noShowReason():Checks.text(req.outcome())?req.outcome():"");
        return view(appointments.selectByPrimaryKey(a.id),p);
    }
    private static String title(String type){return switch(type){case "EXAM"->"预约检查";case "REVISIT"->"预约复诊";case "INPATIENT"->"预约住院";case "SPECIALIST_CLINIC"->"预约专病门诊";default->"预约门诊";};}
    private Appointment byKey(Long hospitalId,String key){AppointmentExample ex=new AppointmentExample();ex.eq("hospital_id",hospitalId).eq("request_key",key);PageHelper.startPage(1,1,false);List<Appointment> rows=appointments.selectByExample(ex);return rows.isEmpty()?null:rows.getFirst();}
    private Map<Long,Patient> names(List<Long> ids){if(ids.isEmpty())return Map.of();PatientExample ex=new PatientExample();ex.eq("hospital_id",CurrentAccount.get().hospitalId()).in("id",ids);ex.selectColumns("id","name");PageHelper.startPage(1,100,false);return patients.selectByExample(ex).stream().collect(Collectors.toMap(r->r.id,Function.identity()));}
    public static AppointmentResponse view(Appointment a,Patient p){
        return new AppointmentResponse(a.id,a.patientId,p==null?"":PatientService.maskName(p.name),a.taskId,a.invitationId,a.referralId,a.appointmentType,a.channel,a.appointmentAt,a.department,a.clinicianId,a.status,a.reminderSentAt,a.arrivedAt,a.effective,a.noShowReason,a.outcome,a.outcomeNote,a.evidence,a.actorId,a.version,a.gmtCreate);
    }
}
