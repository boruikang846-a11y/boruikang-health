package com.bgssai.health.org.service;
import com.bgssai.health.audit.service.AuditService;
import com.bgssai.health.auth.service.CurrentAccount;
import com.bgssai.health.common.*;
import com.bgssai.health.mapper.*;
import com.bgssai.health.model.*;
import com.bgssai.health.org.dto.*;
import com.bgssai.health.patient.service.PatientAccess;
import com.bgssai.health.patient.service.PatientService;
import com.github.pagehelper.PageHelper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
/** Hospital organisation tree, outreach campaigns and SLA configuration. Manager writes, all staff read. */
@Service
public class OrgService {
    private static final Logger log=LoggerFactory.getLogger(OrgService.class);
        private final CareOrgMapper orgs;private final CampaignMapper campaigns;private final SlaConfigMapper slas;private final PatientAccess access;private final AuditService audit;private final PatientService patients;private final SlaResolver resolver;
    public OrgService(CareOrgMapper orgs,CampaignMapper campaigns,SlaConfigMapper slas,PatientAccess access,AuditService audit,PatientService patients,SlaResolver resolver){this.orgs=orgs;this.campaigns=campaigns;this.slas=slas;this.access=access;this.audit=audit;this.patients=patients;this.resolver=resolver;}
    public List<OrgResponse> orgs(){
        log.info("list orgs hospitalId={}",CurrentAccount.get().hospitalId());access.staff();CareOrgExample ex=new CareOrgExample();ex.eq("hospital_id",CurrentAccount.get().hospitalId());ex.setOrderByClause("org_type ASC,id ASC");
        PageHelper.startPage(1,500,false);
        return orgs.selectByExample(ex).stream().map(OrgService::view).toList();
    }
    @Transactional
    public OrgResponse saveOrg(SaveOrgRequest req){
        log.info("save org id={} name={}",req.id(),req.name());access.manager();Long hospitalId=CurrentAccount.get().hospitalId();
        if(req.parentId()!=null){CareOrg parent=orgs.selectByPrimaryKey(req.parentId());Checks.require(parent!=null&&hospitalId.equals(parent.hospitalId)&&!req.parentId().equals(req.id()),"Parent organisation must belong to this hospital / 上级机构无效");}
        CareOrgExample duplicate=new CareOrgExample();duplicate.eq("hospital_id",hospitalId).eq("name",req.name().trim());if(req.id()!=null)duplicate.ne("id",req.id());
        Checks.require(orgs.countByExample(duplicate)==0,"Organisation name already exists / 机构名称重复");
        CareOrg row=new CareOrg();row.name=req.name().trim();row.orgType=req.orgType();row.parentId=req.parentId();row.contactName=req.contactName();row.contactPhone=req.contactPhone();row.active=req.active()==null||req.active();row.note=req.note();
        if(req.id()==null){row.hospitalId=hospitalId;row.creator=CurrentAccount.get().userId().toString();orgs.insertSelective(row);audit.append(null,"ORG_CREATED",row.id,null,"ACTIVE",row.orgType);}
        else{CareOrg old=orgs.selectByPrimaryKey(req.id());Checks.found(old!=null&&hospitalId.equals(old.hospitalId));row.modifier=CurrentAccount.get().userId().toString();
            CareOrgExample ex=new CareOrgExample();ex.eq("id",old.id).eq("hospital_id",hospitalId);Checks.conflict(orgs.updateByExampleSelective(row,ex)==1);row.id=old.id;audit.append(null,"ORG_UPDATED",old.id,String.valueOf(old.active),String.valueOf(row.active),row.orgType);}
        return view(orgs.selectByPrimaryKey(row.id));
    }
    public CareOrg requireOrg(Long id){if(id==null)return null;CareOrg row=orgs.selectByPrimaryKey(id);Checks.require(row!=null&&CurrentAccount.get().hospitalId().equals(row.hospitalId)&&Boolean.TRUE.equals(row.active),"Select an active organisation / 请选择本院有效机构");return row;}
    public Paged<CampaignResponse> campaigns(CampaignQueryRequest req){
        log.info("query campaigns status={}",req.status());access.staff();CampaignExample ex=new CampaignExample();ex.eq("hospital_id",CurrentAccount.get().hospitalId());
        if(Checks.text(req.status()))ex.eq("status",req.status());if(Checks.text(req.campaignType()))ex.eq("campaign_type",req.campaignType());ex.setOrderByClause("status ASC,id DESC");
        PageHelper.startPage(Paged.number(req.page()),Paged.size(req.size()));
        List<Campaign> rows=campaigns.selectByExample(ex);return Paged.of(rows,OrgService::view);
    }
    @Transactional
    public CampaignResponse saveCampaign(SaveCampaignRequest req){
        log.info("save campaign id={} name={}",req.id(),req.name());access.manager();Long hospitalId=CurrentAccount.get().hospitalId();
        requireOrg(req.orgId());patients.validateStaff(req.ownerId(),"OPERATOR","NURSE","MANAGER");
        Checks.require(req.startsOn()==null||req.endsOn()==null||!req.endsOn().isBefore(req.startsOn()),"Campaign end must not precede start / 结束日期不能早于开始日期");
        CampaignExample duplicate=new CampaignExample();duplicate.eq("hospital_id",hospitalId).eq("name",req.name().trim());if(req.id()!=null)duplicate.ne("id",req.id());
        Checks.require(campaigns.countByExample(duplicate)==0,"Campaign name already exists / 活动名称重复");
        Campaign row=new Campaign();row.name=req.name().trim();row.campaignType=req.campaignType();row.orgId=req.orgId();row.location=req.location();row.startsOn=req.startsOn();row.endsOn=req.endsOn();row.ownerId=req.ownerId();row.status=req.status()==null?"PLANNED":req.status();row.targetCount=req.targetCount();row.note=req.note();
        if(req.id()==null){row.hospitalId=hospitalId;row.version=0;row.creator=CurrentAccount.get().userId().toString();campaigns.insertSelective(row);audit.append(null,"CAMPAIGN_CREATED",row.id,null,row.status,row.campaignType);}
        else{Campaign old=campaigns.selectByPrimaryKey(req.id());Checks.found(old!=null&&hospitalId.equals(old.hospitalId));Checks.conflict(req.version()!=null&&req.version().equals(old.version));
            row.version=old.version+1;row.modifier=CurrentAccount.get().userId().toString();CampaignExample ex=new CampaignExample();ex.eq("id",old.id).eq("hospital_id",hospitalId).eq("version",old.version);
            Checks.conflict(campaigns.updateByExampleSelective(row,ex)==1);row.id=old.id;audit.append(null,"CAMPAIGN_UPDATED",old.id,old.status,row.status,"version="+row.version);}
        return view(campaigns.selectByPrimaryKey(row.id));
    }
    public Campaign requireCampaign(Long id){if(id==null)return null;Campaign row=campaigns.selectByPrimaryKey(id);Checks.require(row!=null&&CurrentAccount.get().hospitalId().equals(row.hospitalId)&&!"CLOSED".equals(row.status),"Select an open campaign / 请选择未结束的活动");return row;}
    public List<SlaResponse> slas(){
        log.info("list sla hospitalId={}",CurrentAccount.get().hospitalId());access.staff();SlaConfigExample ex=new SlaConfigExample();ex.eq("hospital_id",CurrentAccount.get().hospitalId());
        PageHelper.startPage(1,20,false);
        List<SlaConfig> rows=slas.selectByExample(ex);
        return SlaResolver.RISKS.stream().map(r->rows.stream().filter(x->r.equals(x.riskLevel)).findFirst().map(OrgService::view).orElseGet(()->view(SlaResolver.defaults(r)))).toList();
    }
    @Transactional
    public SlaResponse saveSla(SaveSlaRequest req){
        log.info("save sla risk={}",req.riskLevel());access.manager();Long hospitalId=CurrentAccount.get().hospitalId();
        SlaConfigExample ex=new SlaConfigExample();ex.eq("hospital_id",hospitalId).eq("risk_level",req.riskLevel());PageHelper.startPage(1,1,false);
        List<SlaConfig> rows=slas.selectByExample(ex);
        SlaConfig row=new SlaConfig();row.firstContactHours=req.firstContactHours();row.bookingDays=req.bookingDays();row.arrivalDays=req.arrivalDays();row.lostAfterAttempts=req.lostAfterAttempts();row.note=req.note();
        if(rows.isEmpty()){row.hospitalId=hospitalId;row.riskLevel=req.riskLevel();row.version=0;row.creator=CurrentAccount.get().userId().toString();slas.insertSelective(row);}
        else{SlaConfig old=rows.getFirst();row.version=old.version+1;row.modifier=CurrentAccount.get().userId().toString();SlaConfigExample cond=new SlaConfigExample();cond.eq("id",old.id).eq("version",old.version);Checks.conflict(slas.updateByExampleSelective(row,cond)==1);row.id=old.id;}
        audit.append(null,"SLA_CONFIG_SAVED",row.id,null,req.riskLevel(),"first="+req.firstContactHours()+"h; booking="+req.bookingDays()+"d; arrival="+req.arrivalDays()+"d; lost="+req.lostAfterAttempts());
        return view(slas.selectByPrimaryKey(row.id));
    }
    public SlaConfig resolve(String riskLevel){return resolver.resolve(riskLevel);}
    public LocalDateTime firstContactDue(String riskLevel,LocalDateTime from){return resolver.firstContactDue(riskLevel,from);}
    private static OrgResponse view(CareOrg o){return new OrgResponse(o.id,o.name,o.orgType,o.parentId,o.contactName,o.contactPhone,o.active,o.note);}
    private static CampaignResponse view(Campaign c){return new CampaignResponse(c.id,c.name,c.campaignType,c.orgId,c.location,c.startsOn,c.endsOn,c.ownerId,c.status,c.targetCount,c.note,c.version);}
    private static SlaResponse view(SlaConfig s){return new SlaResponse(s.id,s.riskLevel,s.firstContactHours,s.bookingDays,s.arrivalDays,s.lostAfterAttempts,s.note,s.version);}
}
