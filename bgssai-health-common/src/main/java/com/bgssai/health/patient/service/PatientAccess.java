package com.bgssai.health.patient.service;
import com.bgssai.health.auth.service.CurrentAccount;
import com.bgssai.health.common.Checks;
import com.bgssai.health.mapper.PatientMapper;
import com.bgssai.health.model.*;
import com.github.pagehelper.PageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
@Service
public class PatientAccess {
    private final PatientMapper patients;
    public PatientAccess(PatientMapper patients) { this.patients=patients; }
    public void staff() { Checks.permit(List.of("MANAGER","OPERATOR").contains(CurrentAccount.get().roleCode())); }
    public void manager() { Checks.permit("MANAGER".equals(CurrentAccount.get().roleCode())); }
    public PatientExample scope() {
        staff(); var actor=CurrentAccount.get(); PatientExample ex=new PatientExample(); ex.eq("hospital_id",actor.hospitalId());
        if ("OPERATOR".equals(actor.roleCode())) ex.eq("owner_id",actor.userId());
        return ex;
    }
    public CareTaskExample taskScope() {
        staff(); var actor=CurrentAccount.get(); CareTaskExample ex=new CareTaskExample(); ex.eq("hospital_id",actor.hospitalId());
        if ("OPERATOR".equals(actor.roleCode())) ex.eq("assignee_id",actor.userId());
        return ex;
    }
    public Patient require(Long id) {
        Patient p=patients.selectByPrimaryKey(id);
        return verify(p);
    }
    @Transactional(propagation=Propagation.MANDATORY)
    public Patient lock(Long id) {
        PatientExample ex=new PatientExample();
        ex.eq("id",id).eq("hospital_id",CurrentAccount.get().hospitalId());
        ex.setForUpdate(true);
        // Unique primary-key lookup: pagination would append LIMIT after FOR UPDATE.
        List<Patient> rows=patients.selectByExample(ex);
        return verify(rows.isEmpty()?null:rows.getFirst());
    }
    private Patient verify(Patient p) {
        var actor=CurrentAccount.get();
        Checks.found(p != null && actor.hospitalId().equals(p.hospitalId));
        boolean visible=switch(actor.roleCode()) {
            case "MANAGER" -> true;
            case "OPERATOR" -> actor.userId().equals(p.ownerId);
            case "USER" -> actor.userId().equals(p.accountId);
            default -> false;
        };
        Checks.found(visible); return p;
    }
    public Patient own(boolean required) {
        var actor=CurrentAccount.get(); Checks.permit("USER".equals(actor.roleCode()));
        PatientExample ex=new PatientExample(); ex.eq("hospital_id",actor.hospitalId()).eq("account_id",actor.userId());
        PageHelper.startPage(1,1,false);
        List<Patient> rows=patients.selectByExample(ex);
        if (required) Checks.found(!rows.isEmpty());
        return rows.isEmpty()?null:rows.getFirst();
    }
}
