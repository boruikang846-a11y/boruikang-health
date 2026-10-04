package com.boruikang.health.hospital.service;
import com.boruikang.health.hospital.dto.*;
import com.boruikang.health.patient.service.PatientAccess;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class HospitalSyncService {
    private static final Logger log=LoggerFactory.getLogger(HospitalSyncService.class);
    private final HospitalGateway gateway;private final HospitalImportService importer;private final PatientAccess access;
    public HospitalSyncService(HospitalGateway gateway,HospitalImportService importer,PatientAccess access){this.gateway=gateway;this.importer=importer;this.access=access;}
    public HospitalStatusResponse status(){log.info("query hospital mode");access.staff();return new HospitalStatusResponse(gateway.mockEnabled()?"MOCK":"DISABLED",false,MockHospitalGateway.SOURCE);}
    public HospitalBatchResponse preview(HospitalQueryRequest req){log.info("preview hospital mock scenario={}",req.scenario());access.manager();return gateway.fetch(req.scenario());}
    public HospitalSyncResponse sync(HospitalSyncRequest req){
        log.info("sync hospital mock scenario={}",req.scenario());access.manager();
        // Fetch outside the database transaction so a future network adapter cannot hold database locks.
        HospitalBatchResponse batch=gateway.fetch(req.scenario());
        return importer.importBatch(batch,req);
    }
}
