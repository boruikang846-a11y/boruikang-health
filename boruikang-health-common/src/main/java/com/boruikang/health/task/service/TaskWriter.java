package com.boruikang.health.task.service;
import com.boruikang.health.audit.service.AuditService;
import com.boruikang.health.auth.service.CurrentAccount;
import com.boruikang.health.common.Checks;
import com.boruikang.health.mapper.CareTaskMapper;
import com.boruikang.health.model.*;
import com.boruikang.health.patient.service.PatientAccess;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service
public class TaskWriter {
    private final com.boruikang.health.journey.service.JourneyExecutionGuard journeyGuard;
    private final CareTaskMapper tasks;private final AuditService audit;private final PatientAccess access;
    public TaskWriter(CareTaskMapper tasks,AuditService audit,PatientAccess access,com.boruikang.health.journey.service.JourneyExecutionGuard journeyGuard){this.journeyGuard=journeyGuard;this.tasks=tasks;this.audit=audit;this.access=access;}
    @Transactional
    public CareTask save(CareTask before,CareTask patch,String action) {
        access.lock(before.patientId);journeyGuard.check(before);
        patch.version=before.version+1;patch.modifier=CurrentAccount.get().userId().toString();
        CareTaskExample ex=new CareTaskExample();ex.eq("id",before.id).eq("hospital_id",before.hospitalId).eq("version",before.version).eq("status",before.status);
        Checks.conflict(tasks.updateByExampleSelective(patch,ex)==1);
        audit.append(before.patientId,action,before.id,before.status,patch.status==null?before.status:patch.status,"version="+patch.version);
        return tasks.selectByPrimaryKey(before.id);
    }
}
