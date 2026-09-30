package com.bgssai.health.medication.service;
import com.bgssai.health.audit.service.AuditService;
import com.bgssai.health.auth.service.CurrentAccount;
import com.bgssai.health.common.Checks;
import com.bgssai.health.mapper.MedicationMapper;
import com.bgssai.health.medication.dto.*;
import com.bgssai.health.model.*;
import com.bgssai.health.patient.service.PatientAccess;
import com.github.pagehelper.PageHelper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
@Service
public class MedicationService {
    private static final Logger log=LoggerFactory.getLogger(MedicationService.class);
    private final MedicationMapper medications;private final PatientAccess access;private final AuditService audit;
    public MedicationService(MedicationMapper medications,PatientAccess access,AuditService audit){this.medications=medications;this.access=access;this.audit=audit;}
    public List<MedicationResponse> query(MedicationQueryRequest req){
        log.info("query medications patientId={}",req.patientId());access.staff();Patient p=access.require(req.patientId());
        MedicationExample ex=new MedicationExample();ex.eq("hospital_id",p.hospitalId).eq("patient_id",p.id);if(Checks.text(req.status()))ex.eq("status",req.status());ex.setOrderByClause("status ASC,id DESC");
        PageHelper.startPage(1,100,false);return medications.selectByExample(ex).stream().map(MedicationService::view).toList();
    }
    @Transactional
    public MedicationResponse save(SaveMedicationRequest req){
        log.info("save medication patientId={} id={}",req.patientId(),req.id());access.operations();Patient p=access.lock(req.patientId());
        Checks.require(req.startDate()==null||req.endDate()==null||!req.endDate().isBefore(req.startDate()),"End date must not precede start / 停药日期不能早于开始日期");
        Medication row=new Medication();row.drugName=req.drugName().trim();row.dosage=req.dosage();row.frequency=req.frequency();row.startDate=req.startDate();row.endDate=req.endDate();row.status=req.status()==null?"ACTIVE":req.status();row.source=req.source();row.adherence=req.adherence()==null?"UNKNOWN":req.adherence();row.note=req.note();
        if(req.id()==null){row.hospitalId=p.hospitalId;row.patientId=p.id;row.version=0;row.creator=CurrentAccount.get().userId().toString();medications.insertSelective(row);}
        else{Medication old=medications.selectByPrimaryKey(req.id());Checks.found(old!=null&&p.id.equals(old.patientId));Checks.conflict(req.version()!=null&&req.version().equals(old.version));
            row.version=old.version+1;row.modifier=CurrentAccount.get().userId().toString();MedicationExample ex=new MedicationExample();ex.eq("id",old.id).eq("hospital_id",p.hospitalId).eq("version",old.version);Checks.conflict(medications.updateByExampleSelective(row,ex)==1);row.id=old.id;}
        audit.append(p.id,req.id()==null?"MEDICATION_RECORDED":"MEDICATION_UPDATED",row.id,null,row.status,row.drugName+"; source="+row.source+"; adherence="+row.adherence);return view(medications.selectByPrimaryKey(row.id));
    }
    private static MedicationResponse view(Medication m){return new MedicationResponse(m.id,m.patientId,m.drugName,m.dosage,m.frequency,m.startDate,m.endDate,m.status,m.source,m.adherence,m.note,m.version);}
}
