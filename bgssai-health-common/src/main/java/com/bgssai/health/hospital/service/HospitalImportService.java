package com.bgssai.health.hospital.service;
import com.bgssai.health.audit.service.AuditService;
import com.bgssai.health.auth.service.CurrentAccount;
import com.bgssai.health.common.Checks;
import com.bgssai.health.hospital.dto.*;
import com.bgssai.health.mapper.*;
import com.bgssai.health.model.*;
import com.bgssai.health.patient.dto.CreatePatientRequest;
import com.bgssai.health.patient.service.*;
import com.bgssai.health.record.dto.CreateRecordRequest;
import com.bgssai.health.record.service.RecordService;
import com.github.pagehelper.PageHelper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.ArrayList;
import java.util.Objects;

@Service
public class HospitalImportService {
    private static final Logger log=LoggerFactory.getLogger(HospitalImportService.class);
    private final PatientMapper patientMapper;private final CareRecordMapper recordMapper;private final PatientService patients;
    private final RecordService records;private final PatientAccess access;private final AuditService audit;
    public HospitalImportService(PatientMapper patientMapper,CareRecordMapper recordMapper,PatientService patients,RecordService records,PatientAccess access,AuditService audit){
        this.patientMapper=patientMapper;this.recordMapper=recordMapper;this.patients=patients;this.records=records;this.access=access;this.audit=audit;
    }
    @Transactional
    public HospitalSyncResponse importBatch(HospitalBatchResponse batch,HospitalSyncRequest req){
        log.info("import hospital batch source={} count={}",batch.sourceSystem(),batch.patients().size());access.manager();
        Checks.require(MockHospitalGateway.SOURCE.equals(batch.sourceSystem()),"Unsupported hospital source");
        Checks.require(req.doctorId()!=null&&req.ownerId()!=null,"Assign a doctor and care coordinator first");
        patients.validateStaff(req.doctorId(),"DOCTOR");patients.validateStaff(req.ownerId(),"MANAGER","NURSE","OPERATOR");
        Long hospitalId=CurrentAccount.get().hospitalId();int createdPatients=0,existingPatients=0,createdRecords=0,skippedRecords=0;
        var ids=new ArrayList<Long>();
        for(HospitalPatientResponse item:batch.patients()){
            PatientExample ex=new PatientExample();ex.eq("hospital_id",hospitalId).eq("source_system",batch.sourceSystem()).eq("hospital_patient_id",item.hospitalPatientId());
            PageHelper.startPage(1,1,false);var matches=patientMapper.selectByExample(ex);Long patientId;
            if(matches.isEmpty()){
                patientId=patients.importHospital(new CreatePatientRequest(item.name(),item.gender(),item.age(),item.phone(),item.department(),item.disease(),req.doctorId(),req.ownerId(),"虚构医院接口样例，仅用于开发联调"),batch.sourceSystem(),item.hospitalPatientId()).id();
                createdPatients++;
            }else{patientId=matches.getFirst().id;existingPatients++;}
            access.lock(patientId);ids.add(patientId);
            for(HospitalRecordResponse record:item.records()){
                CareRecordExample rx=new CareRecordExample();rx.eq("hospital_id",hospitalId).eq("source_system",batch.sourceSystem()).eq("external_id",record.externalId());
                PageHelper.startPage(1,1,false);var known=recordMapper.selectByExample(rx);
                if(!known.isEmpty()){
                    CareRecord old=known.getFirst();
                    Checks.conflict(patientId.equals(old.patientId)&&Objects.equals(record.recordType(),old.recordType)&&Objects.equals(record.occurredAt(),old.occurredAt)
                        &&Objects.equals(record.content(),old.content)&&Objects.equals(record.medicationCycleDays(),old.medicationCycleDays)&&Objects.equals(record.nextVisitDate(),old.nextVisitDate));
                    skippedRecords++;continue;
                }
                records.importHospital(new CreateRecordRequest(patientId,record.recordType(),record.occurredAt(),record.content(),record.medicationCycleDays(),record.nextVisitDate()),batch.sourceSystem(),record.externalId());createdRecords++;
            }
        }
        audit.append(null,"HOSPITAL_MOCK_SYNC",null,null,"IMPORTED","patients="+createdPatients+"; records="+createdRecords+"; skipped="+skippedRecords);
        return new HospitalSyncResponse(batch.sourceSystem(),createdPatients,existingPatients,createdRecords,skippedRecords,ids);
    }
}
