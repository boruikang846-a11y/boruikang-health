package com.bgssai.health.task.service;
import com.bgssai.health.audit.service.AuditService;
import com.bgssai.health.auth.service.CurrentAccount;
import com.bgssai.health.mapper.CareTaskMapper;
import com.bgssai.health.model.*;
import com.bgssai.health.org.service.SlaResolver;
import com.github.pagehelper.PageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
/** Opens and closes first-contact (OUTREACH) tasks and lost-contact alerts. Caller must already hold the patient lock. */
@Service
public class OutreachService {
    private final CareTaskMapper tasks;private final SlaResolver sla;private final AuditService audit;
    public OutreachService(CareTaskMapper tasks,SlaResolver sla,AuditService audit){this.tasks=tasks;this.sla=sla;this.audit=audit;}
    @Transactional(propagation=Propagation.MANDATORY)
    public CareTask open(Patient p,String requestKey,String detail){
        CareTask existing=byKey(p.hospitalId,requestKey);if(existing!=null)return existing;
        LocalDateTime now=LocalDateTime.now();
        CareTask t=new CareTask();t.hospitalId=p.hospitalId;t.patientId=p.id;t.taskType="OUTREACH";t.title="首次联系并邀约到院";t.priority=SlaResolver.priorityFor(p.riskLevel);
        t.status="PENDING";t.assigneeId=p.ownerId;t.doctorId=p.doctorId;t.dueAt=sla.firstContactDue(p.riskLevel,now);t.slaDueAt=t.dueAt;t.requestKey=requestKey;t.version=0;t.creator=CurrentAccount.get().userId().toString();
        tasks.insertSelective(t);audit.append(p.id,"OUTREACH_OPENED",t.id,null,"PENDING",detail+"; SLA due="+t.slaDueAt);return tasks.selectByPrimaryKey(t.id);
    }
    /** Completes every open OUTREACH task of the patient once a reached invitation is recorded. */
    @Transactional(propagation=Propagation.MANDATORY)
    public void complete(Patient p,String outcome,String evidence){
        for(CareTask t:openOutreach(p)){
            CareTask patch=new CareTask();patch.status="COMPLETED";patch.completedAt=LocalDateTime.now();patch.outcome=outcome;patch.evidence=evidence;patch.contactResult="CONNECTED";patch.version=t.version+1;patch.modifier=CurrentAccount.get().userId().toString();
            CareTaskExample ex=new CareTaskExample();ex.eq("id",t.id).eq("hospital_id",t.hospitalId).eq("version",t.version);
            if(tasks.updateByExampleSelective(patch,ex)==1)audit.append(p.id,"OUTREACH_COMPLETED",t.id,t.status,"COMPLETED",outcome);
        }
    }
    @Transactional(propagation=Propagation.MANDATORY)
    public void progress(Patient p,String result,LocalDateTime nextInviteAt){
        for(CareTask t:openOutreach(p)){
            CareTask patch=new CareTask();patch.status="IN_PROGRESS";patch.contactResult=result;patch.nextContactAt=nextInviteAt;patch.version=t.version+1;patch.modifier=CurrentAccount.get().userId().toString();
            CareTaskExample ex=new CareTaskExample();ex.eq("id",t.id).eq("hospital_id",t.hospitalId).eq("version",t.version);tasks.updateByExampleSelective(patch,ex);
        }
    }
    /** Raises one open P1 lost-contact alert per patient; idempotent while that alert is still open. */
    @Transactional(propagation=Propagation.MANDATORY)
    public CareTask escalateLost(Patient p,int attempts){
        CareTaskExample open=new CareTaskExample();open.eq("hospital_id",p.hospitalId).eq("patient_id",p.id).eq("task_type","ALERT").eq("alert_source","LOST_CONTACT").ne("status","COMPLETED").ne("status","CANCELLED");
        PageHelper.startPage(1,1,false);List<CareTask> rows=tasks.selectByExample(open);if(!rows.isEmpty())return rows.getFirst();
        LocalDateTime now=LocalDateTime.now();
        CareTask t=new CareTask();t.hospitalId=p.hospitalId;t.patientId=p.id;t.taskType="ALERT";t.title="连续"+attempts+"次未联系上，疑似失联";t.priority="P1";t.status="PENDING";t.alertSource="LOST_CONTACT";
        t.assigneeId=p.ownerId;t.doctorId=p.doctorId;t.dueAt=now.plusHours(24);t.slaDueAt=t.dueAt;t.requestKey="lost-contact-"+p.id+"-"+now.toLocalDate();t.version=0;t.creator=CurrentAccount.get().userId().toString();
        CareTask existing=byKey(p.hospitalId,t.requestKey);if(existing!=null)return existing;
        tasks.insertSelective(t);audit.append(p.id,"LOST_CONTACT_ESCALATED",t.id,null,"PENDING","attempts="+attempts);return tasks.selectByPrimaryKey(t.id);
    }
    private List<CareTask> openOutreach(Patient p){
        CareTaskExample ex=new CareTaskExample();ex.eq("hospital_id",p.hospitalId).eq("patient_id",p.id).eq("task_type","OUTREACH").ne("status","COMPLETED").ne("status","CANCELLED");
        PageHelper.startPage(1,20,false);return tasks.selectByExample(ex);
    }
    private CareTask byKey(Long hospitalId,String key){
        CareTaskExample ex=new CareTaskExample();ex.eq("hospital_id",hospitalId).eq("request_key",key);PageHelper.startPage(1,1,false);
        List<CareTask> rows=tasks.selectByExample(ex);return rows.isEmpty()?null:rows.getFirst();
    }
}
