package com.boruikang.health.patient.service;
import com.boruikang.health.auth.service.CurrentAccount;
import com.boruikang.health.common.Checks;
import com.boruikang.health.mapper.PatientMapper;
import com.boruikang.health.model.*;
import com.github.pagehelper.PageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
/**
 * Role and patient-scope rules of the admin portal.
 * MANAGER sees the whole hospital; OPERATOR and NURSE work on patients assigned to them (owner);
 * DOCTOR reads patients whose responsible doctor they are and performs the clinical review actions.
 */
@Service
public class PatientAccess {
    public static final List<String> STAFF=List.of("MANAGER","OPERATOR","NURSE","DOCTOR");
    public static final List<String> OPERATIONS=List.of("MANAGER","OPERATOR","NURSE");
    public static final List<String> OWNERS=List.of("MANAGER","OPERATOR","NURSE");
    private final PatientMapper patients;
    public PatientAccess(PatientMapper patients) { this.patients=patients; }
    /** Any logged-in clinical or operations account; reads stay inside {@link #scope()}. */
    public void staff() { Checks.permit(STAFF.contains(CurrentAccount.get().roleCode())); }
    /** Operational writes and ledgers: our operations team and hospital nurses. Doctors are read-only here. */
    public void operations() { Checks.permit(OPERATIONS.contains(CurrentAccount.get().roleCode())); }
    public void manager() { Checks.permit("MANAGER".equals(CurrentAccount.get().roleCode())); }
    public void doctor() { Checks.permit("DOCTOR".equals(CurrentAccount.get().roleCode())); }
    /** OPERATOR and NURSE only see and record their own assigned work. */
    public boolean executor() { return List.of("OPERATOR","NURSE").contains(CurrentAccount.get().roleCode()); }
    public boolean isDoctor() { return "DOCTOR".equals(CurrentAccount.get().roleCode()); }
    public PatientExample scope() {
        staff(); var actor=CurrentAccount.get(); PatientExample ex=new PatientExample(); ex.eq("hospital_id",actor.hospitalId());
        if (executor()) ex.eq("owner_id",actor.userId());
        if (isDoctor()) ex.eq("doctor_id",actor.userId());
        return ex;
    }
    public CareTaskExample taskScope() {
        staff(); var actor=CurrentAccount.get(); CareTaskExample ex=new CareTaskExample(); ex.eq("hospital_id",actor.hospitalId());
        if (executor()) ex.eq("assignee_id",actor.userId());
        if (isDoctor()) ex.eq("doctor_id",actor.userId());
        return ex;
    }
    /** Ids of the patients in the caller's scope (bounded), for ledgers that only carry patient_id. */
    public List<Long> scopedPatientIds(int limit) {
        PatientExample ex=scope();ex.selectColumns("id");PageHelper.startPage(1,limit,false);
        return patients.selectByExample(ex).stream().map(p->p.id).toList();
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
            case "OPERATOR","NURSE" -> actor.userId().equals(p.ownerId);
            case "DOCTOR" -> actor.userId().equals(p.doctorId);
            case "USER" -> actor.userId().equals(p.accountId);
            default -> false;
        };
        Checks.found(visible); return p;
    }
    /** The caller must be the patient's current responsible doctor. */
    public void responsibleDoctor(Patient p) {
        var actor=CurrentAccount.get();
        Checks.permit("DOCTOR".equals(actor.roleCode())&&actor.userId().equals(p.doctorId));
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
