package com.boruikang.health.admin;

import com.boruikang.health.auth.dto.AccountInfo;
import com.boruikang.health.auth.service.CurrentAccount;
import com.boruikang.health.common.exception.BizException;
import com.boruikang.health.hospital.dto.*;
import com.boruikang.health.hospital.service.*;
import com.boruikang.health.mapper.*;
import com.boruikang.health.model.*;
import com.boruikang.health.patient.dto.*;
import com.boruikang.health.patient.service.PatientService;
import com.boruikang.health.task.dto.*;
import com.boruikang.health.task.service.TaskService;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:health-hospital;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1","logging.level.root=WARN"})
@Transactional
class HospitalMockTest {
    @Autowired HospitalSyncService hospital;
    @Autowired HospitalImportService importer;
    @Autowired PatientService patients;
    @Autowired TaskService tasks;
    @Autowired PatientMapper patientMapper;
    @Autowired CareRecordMapper recordMapper;
    @Autowired CareTaskMapper taskMapper;
    @BeforeEach void setup(){CurrentAccount.set(new AccountInfo(1L,"Operations","MANAGER",1L));}
    @AfterEach void cleanup(){CurrentAccount.clear();}
    private HospitalSyncRequest request(String scenario){return new HospitalSyncRequest(scenario,2L,3L);}
    @Test void repeatedSyncPreservesIdentityAssignmentAndTaskCounts(){
        var first=hospital.sync(request("NORMAL"));assertEquals(2,first.createdPatients());assertEquals(3,first.createdRecords());
        var patient=patients.detail(first.patientIds().getFirst());
        assertEquals("HOSPITAL_MOCK",patient.sourceSystem());assertEquals("MOCK-P-001",patient.hospitalPatientId());
        // A matching fictional phone already exists in the seed; it must not merge with that patient.
        assertNotEquals(1001L,patient.id());
        var before=taskMapper.countByExample(new CareTaskExample());
        patients.update(new UpdatePatientRequest(patient.id(),patient.version(),5L,3L,null,null,null,null,null));
        var second=hospital.sync(request("NORMAL"));
        assertEquals(0,second.createdPatients());assertEquals(2,second.existingPatients());assertEquals(0,second.createdRecords());assertEquals(3,second.skippedRecords());
        assertEquals(first.patientIds(),second.patientIds());assertEquals(before,taskMapper.countByExample(new CareTaskExample()));
        assertEquals(5L,patients.detail(patient.id()).doctorId());
    }
    @Test void dischargeImportCreatesLinkedTasksAndPreservesMissingFacts(){
        var synced=hospital.sync(request("NORMAL"));
        var list=tasks.query(new TaskQueryRequest(0,100,synced.patientIds().getFirst(),null,null,null,false)).items();
        assertEquals(3,list.size());assertEquals(1,list.stream().filter(x->x.taskType().equals("REVISIT")).count());
        var discharge=list.stream().filter(x->x.title().contains("出院报告")).findFirst().orElseThrow();
        var context=tasks.context(discharge.id());assertEquals("MOCK-DC-001",context.record().externalId());assertEquals("HOSPITAL_MOCK",context.record().sourceSystem());
        var claimed=tasks.claim(new ClaimTaskRequest(discharge.id(),discharge.version()));
        var draft=tasks.draft(new DraftTaskRequest(claimed.id(),claimed.version(),null,"TEMPLATE",null));
        assertTrue(draft.draftText().contains("14 天"));assertTrue(draft.draftText().contains("2026-10-03"));
        var missing=tasks.query(new TaskQueryRequest(0,100,synced.patientIds().get(1),null,null,null,false)).items();
        assertEquals(1,missing.size());assertNull(tasks.context(missing.getFirst().id()).record().nextVisitDate());
        var next=tasks.claim(new ClaimTaskRequest(missing.getFirst().id(),missing.getFirst().version()));
        var missingDraft=tasks.draft(new DraftTaskRequest(next.id(),next.version(),null,"TEMPLATE",null));
        assertFalse(missingDraft.draftText().contains("14 天"));assertFalse(missingDraft.draftText().contains("2026-10-03"));
    }
    @Test void unavailableAndEmptyScenariosDoNotCreateBusinessRows(){
        long patientCount=patientMapper.countByExample(new PatientExample()),recordCount=recordMapper.countByExample(new CareRecordExample()),taskCount=taskMapper.countByExample(new CareTaskExample());
        assertEquals("503000",assertThrows(BizException.class,()->hospital.sync(request("UNAVAILABLE"))).getCode());
        var empty=hospital.sync(request("EMPTY"));assertEquals(0,empty.createdPatients());assertTrue(empty.patientIds().isEmpty());
        assertEquals(patientCount,patientMapper.countByExample(new PatientExample()));assertEquals(recordCount,recordMapper.countByExample(new CareRecordExample()));assertEquals(taskCount,taskMapper.countByExample(new CareTaskExample()));
    }
    @Test void onlyOperationsCanPreviewAndImport(){
        for(String role:List.of("DOCTOR","NURSE","OPERATOR","PLATFORM_ADMIN")){
            CurrentAccount.set(new AccountInfo(2L,"Non-manager",role,1L));
            assertEquals("4003",assertThrows(BizException.class,()->hospital.preview(new HospitalQueryRequest("NORMAL"))).getCode());
            assertEquals("4003",assertThrows(BizException.class,()->hospital.sync(request("NORMAL"))).getCode());
        }
    }
    @Test void sourceIdentityIsScopedToHospitalAndStaffMustBelongToIt(){
        hospital.sync(request("NORMAL"));CurrentAccount.set(new AccountInfo(900L,"Other hospital","MANAGER",2L));
        assertEquals("50000001",assertThrows(BizException.class,()->hospital.sync(request("NORMAL"))).getCode());
        PatientExample other=new PatientExample();other.eq("hospital_id",2L);assertEquals(0,patientMapper.countByExample(other));
    }
    @Test void productionCannotEnableMockEvenWithModeOverride(){
        var environment=new StandardEnvironment();environment.setActiveProfiles("prod");
        var gateway=new MockHospitalGateway("MOCK",environment);
        assertFalse(gateway.mockEnabled());assertEquals("409000",assertThrows(BizException.class,()->gateway.fetch("NORMAL")).getCode());
    }
    @Test @Transactional(propagation=Propagation.NOT_SUPPORTED)
    void reportConflictRollsBackAnEntireImportBatch() {
        long beforePatients=patientMapper.countByExample(new PatientExample()),beforeRecords=recordMapper.countByExample(new CareRecordExample()),beforeTasks=taskMapper.countByExample(new CareTaskExample());
        var report=new HospitalRecordResponse("MOCK-CONFLICT","DISCHARGE",java.time.LocalDateTime.of(2026,9,20,8,0),"Fictional report",null,null);
        var first=new HospitalPatientResponse("MOCK-ROLLBACK-1","Rollback one","MALE",50,"00000000301","全科","演示",List.of(report));
        var second=new HospitalPatientResponse("MOCK-ROLLBACK-2","Rollback two","FEMALE",52,"00000000302","全科","演示",List.of(report));
        var batch=new HospitalBatchResponse("HOSPITAL_MOCK","NORMAL",List.of(first,second));
        assertEquals("409000",assertThrows(BizException.class,()->importer.importBatch(batch,request("NORMAL"))).getCode());
        assertEquals(beforePatients,patientMapper.countByExample(new PatientExample()));
        assertEquals(beforeRecords,recordMapper.countByExample(new CareRecordExample()));
        assertEquals(beforeTasks,taskMapper.countByExample(new CareTaskExample()));
    }
    @Test void changedReportWithSameSourceIdCannotOverwriteClinicalEvidence(){
        hospital.sync(request("NORMAL"));var batch=hospital.preview(new HospitalQueryRequest("NORMAL"));
        var patient=batch.patients().getFirst();var original=patient.records().getFirst();
        var changed=new HospitalRecordResponse(original.externalId(),original.recordType(),original.occurredAt(),"Changed report",original.medicationCycleDays(),original.nextVisitDate());
        var revised=new HospitalPatientResponse(patient.hospitalPatientId(),patient.name(),patient.gender(),patient.age(),patient.phone(),patient.department(),patient.disease(),List.of(changed));
        assertEquals("409000",assertThrows(BizException.class,()->importer.importBatch(new HospitalBatchResponse(batch.sourceSystem(),"NORMAL",List.of(revised)),request("NORMAL"))).getCode());
        CareRecordExample ex=new CareRecordExample();ex.eq("source_system",batch.sourceSystem()).eq("external_id",original.externalId());
        assertEquals(original.content(),recordMapper.selectByExample(ex).getFirst().content);
    }
}
