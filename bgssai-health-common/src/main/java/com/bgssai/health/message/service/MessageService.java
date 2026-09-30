package com.bgssai.health.message.service;
import com.bgssai.health.audit.service.AuditService;
import com.bgssai.health.auth.service.CurrentAccount;
import com.bgssai.health.common.Paged;
import com.bgssai.health.common.dto.PageRequest;
import com.bgssai.health.mapper.*;
import com.bgssai.health.model.*;
import com.bgssai.health.message.dto.*;
import com.bgssai.health.patient.service.PatientAccess;
import com.github.pagehelper.PageHelper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
@Service
public class MessageService {
    private static final Logger log=LoggerFactory.getLogger(MessageService.class);
    private final CareMessageMapper messages;private final CareTaskMapper tasks;private final PatientAccess access;private final AuditService audit;
    public MessageService(CareMessageMapper messages,CareTaskMapper tasks,PatientAccess access,AuditService audit){this.messages=messages;this.tasks=tasks;this.access=access;this.audit=audit;}
    public Paged<MessageResponse> query(MessageQueryRequest req){log.info("query messages patientId={}",req.patientId());access.staff();return query(access.require(req.patientId()),req.page(),req.size());}
    public Paged<MessageResponse> own(PageRequest req){log.info("query own messages accountId={}",CurrentAccount.get().userId());return query(access.own(true),req.page(),req.size());}
    private Paged<MessageResponse> query(Patient p,Integer page,Integer size){
        CareMessageExample ex=new CareMessageExample();ex.eq("hospital_id",p.hospitalId).eq("patient_id",p.id);
        PageHelper.startPage(Paged.number(page),Paged.size(size));
        List<CareMessage> rows=messages.selectByExample(ex);return Paged.of(rows,MessageService::view);
    }
    @Transactional
    public MessageResponse create(CreateMessageRequest req){
        log.info("create patient consultation accountId={}",CurrentAccount.get().userId());Patient p=access.lock(access.own(true).id);
        CareTask t=new CareTask();t.hospitalId=p.hospitalId;t.patientId=p.id;t.taskType="CONSULTATION";t.title="患者咨询待人工回复";t.priority="P2";t.status="PENDING";
        t.assigneeId=p.ownerId;t.doctorId=p.doctorId;t.dueAt=LocalDateTime.now().plusDays(1);t.requestKey=UUID.randomUUID().toString();t.version=0;t.creator=CurrentAccount.get().userId().toString();tasks.insertSelective(t);
        CareMessage m=new CareMessage();m.hospitalId=p.hospitalId;m.patientId=p.id;m.taskId=t.id;m.senderId=CurrentAccount.get().userId();m.senderRole="USER";
        m.direction="PATIENT_TO_STAFF";m.content=req.content().trim();m.creator=t.creator;messages.insertSelective(m);
        audit.append(p.id,"CONSULTATION_RECEIVED",t.id,null,"PENDING","Web message; human reply required");return view(messages.selectByPrimaryKey(m.id));
    }
    public static MessageResponse view(CareMessage m){return new MessageResponse(m.id,m.taskId,m.direction,m.content,m.gmtCreate);}
}
