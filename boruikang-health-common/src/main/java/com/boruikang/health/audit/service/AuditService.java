package com.boruikang.health.audit.service;
import com.boruikang.health.audit.dto.*;
import com.boruikang.health.auth.service.CurrentAccount;
import com.boruikang.health.common.Paged;
import com.boruikang.health.mapper.AuditEventMapper;
import com.boruikang.health.model.*;
import com.boruikang.health.patient.service.PatientAccess;
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
    /** Events that arrive without a logged-in account (WeChat callbacks); the actor is recorded as 0. */
    public void appendSystem(Long hospitalId,Long patientId,String action,Long resourceId,String before,String after,String detail) {
        AuditEvent row=new AuditEvent(); row.hospitalId=hospitalId; row.actorId=0L;
        row.patientId=patientId;row.action=action;row.resourceId=resourceId;row.beforeState=before;row.afterState=after;row.detail=detail;row.creator="wechat-callback";
        events.insertSelective(row);log.info("audit action={} actorId=0 resourceId={}",action,resourceId);
    }
    public Paged<AuditResponse> query(AuditQueryRequest req) {
        log.info("query audits patientId={}",req.patientId());access.staff(); access.require(req.patientId());
        AuditEventExample ex=new AuditEventExample();ex.eq("hospital_id",CurrentAccount.get().hospitalId()).eq("patient_id",req.patientId());
        PageHelper.startPage(Paged.number(req.page()),Paged.size(req.size()));
        List<AuditEvent> rows=events.selectByExample(ex);
        return Paged.of(rows,r->new AuditResponse(r.id,r.actorId,r.action,r.resourceId,r.beforeState,r.afterState,r.detail,r.gmtCreate));
    }
}
