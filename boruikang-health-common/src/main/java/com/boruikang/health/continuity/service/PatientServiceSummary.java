package com.boruikang.health.continuity.service;

import com.boruikang.health.continuity.dto.*;
import com.boruikang.health.journey.service.ServiceAuthorization;
import com.boruikang.health.mapper.*;
import com.boruikang.health.model.*;
import com.boruikang.health.patient.service.PatientAccess;
import com.github.pagehelper.PageHelper;
import org.springframework.stereotype.Service;
import java.util.*;

@Service
public class PatientServiceSummary {
    private final PatientAccess access;private final ServiceAuthorization authorization;private final ContinuousCareService continuity;
    private final HealthAccountMapper accounts;private final CareRecordMapper records;private final ServiceJourneyMapper journeys;
    private final CareTaskMapper tasks;private final JourneyCaseMapper issues;private final AppointmentMapper appointments;
    public PatientServiceSummary(PatientAccess access,ServiceAuthorization authorization,ContinuousCareService continuity,
        HealthAccountMapper accounts,CareRecordMapper records,ServiceJourneyMapper journeys,CareTaskMapper tasks,JourneyCaseMapper issues,AppointmentMapper appointments) {
        this.access=access;this.authorization=authorization;this.continuity=continuity;this.accounts=accounts;this.records=records;
        this.journeys=journeys;this.tasks=tasks;this.issues=issues;this.appointments=appointments;
    }
    private String name(Long id,Long hospitalId) {var a=id==null?null:accounts.selectByPrimaryKey(id);return a!=null&&Objects.equals(a.hospitalId,hospitalId)?a.realName:null;}
    public PatientServiceSummaryResponse summary(ContinuousCareQueryRequest req) {
        access.staff();var p=access.require(req.patientId());
        var re=new CareRecordExample();re.eq("hospital_id",p.hospitalId).eq("patient_id",p.id).in("record_type",List.of("OUTPATIENT","DISCHARGE","EXAM"));re.setOrderByClause("occurred_at DESC,id DESC");
        PageHelper.startPage(1,1,false);var reports=records.selectByExample(re);PatientServiceSummaryResponse.Report report=null;
        if(!reports.isEmpty()) {var r=reports.getFirst();boolean reviewed=r.doctorViewedAt!=null&&Objects.equals(r.doctorViewerId,p.doctorId);report=new PatientServiceSummaryResponse.Report(r.id,r.recordType,r.occurredAt,r.sourceSystem,reviewed,reviewed?r.doctorOpinion:null);}
        var je=new ServiceJourneyExample();je.eq("hospital_id",p.hospitalId).eq("patient_id",p.id);je.setOrderByClause("event_at DESC,id DESC");PageHelper.startPage(1,20,false);
        var js=journeys.selectByExample(je).stream().map(j->new PatientServiceSummaryResponse.Journey(j.id,j.kind,j.status,j.eventAt,j.stage)).toList();
        var te=new CareTaskExample();te.eq("hospital_id",p.hospitalId).eq("patient_id",p.id).ne("status","CANCELLED").ne("status","COMPLETED");te.setOrderByClause("due_at ASC,id ASC");long taskCount=tasks.countByExample(te);PageHelper.startPage(1,10,false);
        var ts=tasks.selectByExample(te).stream().map(t->new PatientServiceSummaryResponse.Task(t.id,t.taskType,t.title,t.status,t.priority,t.assigneeId,t.dueAt)).toList();
        var ce=new JourneyCaseExample();ce.eq("hospital_id",p.hospitalId).eq("patient_id",p.id).ne("status","CLOSED");ce.setOrderByClause("due_at ASC,id ASC");long caseCount=issues.countByExample(ce);PageHelper.startPage(1,10,false);
        var cs=issues.selectByExample(ce).stream().map(c->new PatientServiceSummaryResponse.Issue(c.id,c.journeyId,c.kind,c.status,c.summary,c.dueAt)).toList();
        var ae=new AppointmentExample();ae.eq("hospital_id",p.hospitalId).eq("patient_id",p.id);ae.setOrderByClause("appointment_at DESC,id DESC");PageHelper.startPage(1,10,false);
        var as=appointments.selectByExample(ae).stream().map(a->new PatientServiceSummaryResponse.Appointment(a.id,a.appointmentType,a.status,a.appointmentAt,a.arrivedAt,a.evidence)).toList();
        var oe=new CareRecordExample();oe.eq("hospital_id",p.hospitalId).eq("patient_id",p.id).eq("record_type","OBSERVATION");oe.setOrderByClause("occurred_at DESC,id DESC");PageHelper.startPage(1,30,false);
        var os=records.selectByExample(oe).stream().map(r->new PatientServiceSummaryResponse.Observation(r.id,r.occurredAt,r.systolic,r.diastolic,r.heartRate,r.weight,r.glucose,r.sourceSystem)).toList();
        return new PatientServiceSummaryResponse(p.id,p.name,p.department,name(p.ownerId,p.hospitalId),name(p.doctorId,p.hospitalId),authorization.active(p)&&!List.of("PAUSED","CLOSED").contains(p.lifecycle),report,js,ts,taskCount,cs,caseCount,as,os,continuity.query(req));
    }
}
