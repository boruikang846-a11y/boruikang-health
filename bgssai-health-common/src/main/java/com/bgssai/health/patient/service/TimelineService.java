package com.bgssai.health.patient.service;
import com.bgssai.health.common.Paged;
import com.bgssai.health.mapper.*;
import com.bgssai.health.model.*;
import com.bgssai.health.patient.dto.*;
import com.github.pagehelper.PageHelper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
/** Merges every ledger touching one patient into a single reverse-chronological timeline. */
@Service
public class TimelineService {
    private static final Logger log=LoggerFactory.getLogger(TimelineService.class);
    private static final int PER_SOURCE=100;
    private final PatientAccess access;private final CareTaskMapper tasks;private final ContactAttemptMapper attempts;private final InvitationMapper invitations;private final AppointmentMapper appointments;
    private final CareRecordMapper records;private final ReferralMapper referrals;private final ServiceEnrollmentMapper enrollments;private final MessageLogMapper messages;private final MedicationMapper medications;private final AuditEventMapper audits;private final WechatContactMapper wechatContacts;private final WechatMessageMapper wechatMessages;
    public TimelineService(PatientAccess access,CareTaskMapper tasks,ContactAttemptMapper attempts,InvitationMapper invitations,AppointmentMapper appointments,CareRecordMapper records,ReferralMapper referrals,ServiceEnrollmentMapper enrollments,MessageLogMapper messages,MedicationMapper medications,AuditEventMapper audits,WechatContactMapper wechatContacts,WechatMessageMapper wechatMessages){
        this.access=access;this.tasks=tasks;this.attempts=attempts;this.invitations=invitations;this.appointments=appointments;this.records=records;this.referrals=referrals;this.enrollments=enrollments;this.messages=messages;this.medications=medications;this.audits=audits;this.wechatContacts=wechatContacts;this.wechatMessages=wechatMessages;}
    public TimelineResponse timeline(TimelineQueryRequest req){
        log.info("timeline patientId={}",req.patientId());access.staff();Patient p=access.require(req.patientId());int limit=req.limit()==null?100:req.limit();
        List<TimelineEvent> events=new ArrayList<>();
        events.add(new TimelineEvent("PATIENT",p.gmtCreate,"建档入组","来源场景 "+p.sourceScene+"；当前阶段 "+p.lifecycle,p.id,p.lifecycle));
        if(p.consentAt!=null)events.add(new TimelineEvent("CONSENT",p.consentAt,"知情同意","版本 "+(p.consentVersion==null?"-":p.consentVersion),p.id,"CONSENTED"));
        CareTaskExample tx=new CareTaskExample();tx.eq("hospital_id",p.hospitalId).eq("patient_id",p.id);tx.setOrderByClause("id DESC");PageHelper.startPage(1,PER_SOURCE,false);
        for(CareTask t:tasks.selectByExample(tx)){events.add(new TimelineEvent("TASK",t.gmtCreate,"任务创建："+t.title,t.taskType+" / "+t.priority+"，截止 "+t.dueAt,t.id,t.status));
            if(t.completedAt!=null)events.add(new TimelineEvent("TASK",t.completedAt,"任务完成："+t.title,t.outcome==null?"":t.outcome,t.id,t.status));}
        ContactAttemptExample cx=new ContactAttemptExample();cx.eq("hospital_id",p.hospitalId).eq("patient_id",p.id);cx.setOrderByClause("id DESC");PageHelper.startPage(1,PER_SOURCE,false);
        for(ContactAttempt c:attempts.selectByExample(cx))events.add(new TimelineEvent("CONTACT",c.contactAt,"联系记录："+c.result,c.method+(c.reason==null?"":"，"+c.reason)+(c.nextPlan==null?"":"；下一步 "+c.nextPlan),c.id,c.result));
        InvitationExample ix=new InvitationExample();ix.eq("hospital_id",p.hospitalId).eq("patient_id",p.id);ix.setOrderByClause("id DESC");PageHelper.startPage(1,PER_SOURCE,false);
        for(Invitation i:invitations.selectByExample(ix))events.add(new TimelineEvent("INVITATION",i.invitedAt,"第"+i.round+"轮邀约："+i.result,i.method+"，"+i.summary,i.id,i.result));
        AppointmentExample ax=new AppointmentExample();ax.eq("hospital_id",p.hospitalId).eq("patient_id",p.id);ax.setOrderByClause("id DESC");PageHelper.startPage(1,PER_SOURCE,false);
        for(Appointment a:appointments.selectByExample(ax)){events.add(new TimelineEvent("APPOINTMENT",a.gmtCreate,"预约："+a.appointmentType,a.department+" "+a.appointmentAt+"，渠道 "+a.channel,a.id,a.status));
            if(a.arrivedAt!=null)events.add(new TimelineEvent("APPOINTMENT",a.arrivedAt,"到院","有效到院 "+(Boolean.FALSE.equals(a.effective)?"否":"是")+(a.outcome==null?"":"，结果 "+a.outcome),a.id,a.status));}
        CareRecordExample rx=new CareRecordExample();rx.eq("hospital_id",p.hospitalId).eq("patient_id",p.id);rx.setOrderByClause("id DESC");PageHelper.startPage(1,PER_SOURCE,false);
        for(CareRecord r:records.selectByExample(rx))events.add(new TimelineEvent("RECORD",r.occurredAt,"记录："+r.recordType,r.content==null?"":r.content.length()>120?r.content.substring(0,120)+"...":r.content,r.id,r.recordType));
        ReferralExample fx=new ReferralExample();fx.eq("hospital_id",p.hospitalId).eq("patient_id",p.id);fx.setOrderByClause("id DESC");PageHelper.startPage(1,PER_SOURCE,false);
        for(Referral r:referrals.selectByExample(fx))events.add(new TimelineEvent("REFERRAL",r.initiatedAt,"转诊："+r.direction+" / "+r.referralType,r.reason,r.id,r.status));
        ServiceEnrollmentExample ex=new ServiceEnrollmentExample();ex.eq("hospital_id",p.hospitalId).eq("patient_id",p.id);ex.setOrderByClause("id DESC");PageHelper.startPage(1,PER_SOURCE,false);
        for(ServiceEnrollment e:enrollments.selectByExample(ex)){events.add(new TimelineEvent("ENROLLMENT",e.signedAt,"服务包签约","单号 "+(e.orderNo==null?"-":e.orderNo),e.id,e.status));
            if(e.activatedAt!=null)events.add(new TimelineEvent("ENROLLMENT",e.activatedAt,"服务包激活","服务期 "+e.startDate+" 至 "+e.endDate,e.id,e.status));
            if(e.closedAt!=null)events.add(new TimelineEvent("ENROLLMENT",e.closedAt,"服务包结案",e.closeReason==null?"":e.closeReason,e.id,e.status));}
        MessageLogExample mx=new MessageLogExample();mx.eq("hospital_id",p.hospitalId).eq("patient_id",p.id);mx.setOrderByClause("id DESC");PageHelper.startPage(1,PER_SOURCE,false);
        for(MessageLog m:messages.selectByExample(mx))events.add(new TimelineEvent("MESSAGE",m.sentAt,"已发消息："+m.channel,(m.templateCode==null?"":"模板 "+m.templateCode+"；")+(m.content.length()>120?m.content.substring(0,120)+"...":m.content),m.id,m.channel));
        MedicationExample dx=new MedicationExample();dx.eq("hospital_id",p.hospitalId).eq("patient_id",p.id);dx.setOrderByClause("id DESC");PageHelper.startPage(1,PER_SOURCE,false);
        for(Medication d:medications.selectByExample(dx))events.add(new TimelineEvent("MEDICATION",d.gmtCreate,"用药："+d.drugName,(d.dosage==null?"":d.dosage+" ")+(d.frequency==null?"":d.frequency)+"，依从 "+d.adherence,d.id,d.status));
        WechatContactExample wx=new WechatContactExample();wx.eq("hospital_id",p.hospitalId).eq("patient_id",p.id);wx.selectColumns("id");PageHelper.startPage(1,20,false);
        List<Long> wechatIds=wechatContacts.selectByExample(wx).stream().map(c->c.id).toList();
        if(!wechatIds.isEmpty()){WechatMessageExample wm=new WechatMessageExample();wm.eq("hospital_id",p.hospitalId).in("contact_id",wechatIds);wm.setOrderByClause("id DESC");PageHelper.startPage(1,PER_SOURCE,false);
            for(WechatMessage w:wechatMessages.selectByExample(wm))events.add(new TimelineEvent("WECHAT",w.sentAt,("OUTBOUND".equals(w.direction)?"微信发出：":"微信收到：")+("WE_COM".equals(w.channel)?"企业微信":"公众号"),w.content.length()>120?w.content.substring(0,120)+"...":w.content,w.id,w.status));}
        AuditEventExample ux=new AuditEventExample();ux.eq("hospital_id",p.hospitalId).eq("patient_id",p.id).in("action",List.of("PATIENT_UPDATED","PATIENT_LIFECYCLE_ADVANCED","TASK_REASSIGNED","LOST_CONTACT_ESCALATED"));ux.setOrderByClause("id DESC");PageHelper.startPage(1,PER_SOURCE,false);
        for(AuditEvent u:audits.selectByExample(ux))events.add(new TimelineEvent("AUDIT",u.gmtCreate,u.action,(u.beforeState==null?"":u.beforeState+" -> ")+(u.afterState==null?"":u.afterState)+(u.detail==null?"":"；"+u.detail),u.id,u.afterState));
        events.sort(Comparator.comparing((TimelineEvent e)->e.at()==null?LocalDateTime.MIN:e.at()).reversed());
        boolean truncated=events.size()>limit;return new TimelineResponse(p.id,truncated?events.subList(0,limit):events,truncated);
    }
}
