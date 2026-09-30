package com.bgssai.health.audit.service;
import com.bgssai.health.audit.dto.*;
import com.bgssai.health.auth.service.CurrentAccount;
import com.bgssai.health.common.Paged;
import com.bgssai.health.mapper.AuditEventMapper;
import com.bgssai.health.model.*;
import com.bgssai.health.patient.service.PatientAccess;
import com.github.pagehelper.PageHelper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import java.util.List;
@Service
public class AuditService {
    private static final Logger log=LoggerFactory.getLogger(AuditService.class);
    private final AuditEventMapper events; private final PatientAccess access;
    public AuditService(AuditEventMapper events,PatientAccess access) { this.events=events;this.access=access; }
    public void append(Long patientId,String action,Long resourceId,String before,String after,String detail) {
        var actor=CurrentAccount.get(); AuditEvent row=new AuditEvent(); row.hospitalId=actor.hospitalId(); row.actorId=actor.userId();
        row.patientId=patientId;row.action=action;row.resourceId=resourceId;row.beforeState=before;row.afterState=after;row.detail=detail;row.creator=actor.userId().toString();
        events.insertSelective(row);log.info("audit action={} actorId={} resourceId={}",action,actor.userId(),resourceId);
    }
    public Paged<AuditResponse> query(AuditQueryRequest req) {
        log.info("query audits patientId={}",req.patientId());access.staff(); access.require(req.patientId());
        AuditEventExample ex=new AuditEventExample();ex.eq("hospital_id",CurrentAccount.get().hospitalId()).eq("patient_id",req.patientId());
        PageHelper.startPage(Paged.number(req.page()),Paged.size(req.size()));
        List<AuditEvent> rows=events.selectByExample(ex);
        return Paged.of(rows,r->new AuditResponse(r.id,r.actorId,r.action,r.resourceId,r.beforeState,r.afterState,r.detail,r.gmtCreate));
    }
}
