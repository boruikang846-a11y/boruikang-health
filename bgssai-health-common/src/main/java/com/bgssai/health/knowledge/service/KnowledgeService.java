package com.bgssai.health.knowledge.service;
import com.bgssai.health.audit.service.AuditService;
import com.bgssai.health.auth.service.CurrentAccount;
import com.bgssai.health.common.*;
import com.bgssai.health.knowledge.dto.*;
import com.bgssai.health.mapper.KnowledgeEntryMapper;
import com.bgssai.health.model.*;
import com.bgssai.health.patient.service.PatientAccess;
import com.github.pagehelper.PageHelper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
@Service
public class KnowledgeService {
    private static final Logger log=LoggerFactory.getLogger(KnowledgeService.class);
    private final KnowledgeEntryMapper entries;private final PatientAccess access;private final AuditService audit;
    public KnowledgeService(KnowledgeEntryMapper entries,PatientAccess access,AuditService audit){this.entries=entries;this.access=access;this.audit=audit;}
    public Paged<KnowledgeResponse> query(KnowledgeQueryRequest req){
        log.info("query knowledge kind={} status={}",req.kind(),req.status());access.staff();KnowledgeEntryExample ex=new KnowledgeEntryExample();ex.eq("hospital_id",CurrentAccount.get().hospitalId());
        if(Checks.text(req.kind()))ex.eq("kind",req.kind());if(Checks.text(req.status()))ex.eq("status",req.status());if(Checks.text(req.keyword()))ex.like("title","%"+req.keyword()+"%");
        PageHelper.startPage(Paged.number(req.page()),Paged.size(req.size()));
        List<KnowledgeEntry> rows=entries.selectByExample(ex);return Paged.of(rows,KnowledgeService::view);
    }
    @Transactional
    public KnowledgeResponse save(SaveKnowledgeRequest req){
        log.info("save knowledge id={} kind={}",req.id(),req.kind());access.staff();Checks.permit(List.of("MANAGER","DOCTOR").contains(CurrentAccount.get().roleCode()));
        permitSopAuthor(req.kind());
        if("PACKAGE".equals(req.kind()))Checks.require(req.serviceDays()!=null&&req.followupCount()!=null,"Package duration and follow-up count required");
        KnowledgeEntry row=new KnowledgeEntry();row.hospitalId=CurrentAccount.get().hospitalId();row.kind=req.kind();row.department=req.department();row.title=req.title();row.content=req.content();
        row.source=req.source();row.status="DRAFT";row.serviceDays=req.serviceDays();row.followupCount=req.followupCount();
        if(req.id()==null){row.version=1;row.creator=CurrentAccount.get().userId().toString();entries.insertSelective(row);}
        else{
            KnowledgeEntry old=require(req.id());permitSopAuthor(old.kind);
            Checks.require(old.kind.equals(req.kind()),"Knowledge type cannot be changed / 内容类型创建后不可更改");
            Checks.conflict(req.version()!=null&&req.version().equals(old.version));row.id=old.id;row.version=old.version+1;row.modifier=CurrentAccount.get().userId().toString();
            KnowledgeEntryExample ex=new KnowledgeEntryExample();ex.eq("id",old.id).eq("hospital_id",old.hospitalId).eq("version",old.version);
            Checks.conflict(entries.updateByExampleSelective(row,ex)==1);
        }
        audit.append(null,"KNOWLEDGE_DRAFT_SAVED",row.id,null,"DRAFT","version="+row.version);return view(entries.selectByPrimaryKey(row.id));
    }
    @Transactional
    public KnowledgeResponse publish(PublishKnowledgeRequest req){
        log.info("publish knowledge id={}",req.id());access.staff();KnowledgeEntry old=require(req.id());
        Checks.permit(("SOP".equals(old.kind)?"MANAGER":"DOCTOR").equals(CurrentAccount.get().roleCode()));
        Checks.conflict(req.version().equals(old.version)&&"DRAFT".equals(old.status));
        KnowledgeEntry patch=new KnowledgeEntry();patch.status="PUBLISHED";patch.reviewerId=CurrentAccount.get().userId();patch.reviewedAt=LocalDateTime.now();patch.modifier=patch.reviewerId.toString();
        KnowledgeEntryExample ex=new KnowledgeEntryExample();ex.eq("id",old.id).eq("hospital_id",old.hospitalId).eq("version",old.version).eq("status","DRAFT");
        Checks.conflict(entries.updateByExampleSelective(patch,ex)==1);audit.append(null,"KNOWLEDGE_PUBLISHED",old.id,"DRAFT","PUBLISHED","version="+old.version);
        return view(entries.selectByPrimaryKey(old.id));
    }
    private KnowledgeEntry require(Long id){KnowledgeEntry row=entries.selectByPrimaryKey(id);Checks.found(row!=null&&CurrentAccount.get().hospitalId().equals(row.hospitalId));return row;}
    private void permitSopAuthor(String kind){if("SOP".equals(kind))Checks.permit("MANAGER".equals(CurrentAccount.get().roleCode()));}
    private static KnowledgeResponse view(KnowledgeEntry k){return new KnowledgeResponse(k.id,k.kind,k.department,k.title,k.content,k.source,k.version,k.status,"PUBLISHED".equals(k.status)?k.reviewerId:null,"PUBLISHED".equals(k.status)?k.reviewedAt:null,k.serviceDays,k.followupCount);}
}
