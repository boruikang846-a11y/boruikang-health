package com.boruikang.health.plan.service;
import com.boruikang.health.audit.service.AuditService;
import com.boruikang.health.auth.service.CurrentAccount;
import com.boruikang.health.common.*;
import com.boruikang.health.mapper.*;
import com.boruikang.health.model.*;
import com.boruikang.health.patient.service.PatientAccess;
import com.boruikang.health.plan.dto.*;
import com.github.pagehelper.PageHelper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
/** Service package catalogue (SKU): tier, period, price and the follow-up plan it expands to. Price is recorded, never charged here. */
@Service
public class PackageService {
    private static final Logger log=LoggerFactory.getLogger(PackageService.class);
    private final ServicePackageMapper packages;private final FollowupPlanMapper plans;private final ServiceEnrollmentMapper enrollments;private final PatientAccess access;private final AuditService audit;private final PlanService planService;
    public PackageService(ServicePackageMapper packages,FollowupPlanMapper plans,ServiceEnrollmentMapper enrollments,PatientAccess access,AuditService audit,PlanService planService){this.packages=packages;this.plans=plans;this.enrollments=enrollments;this.access=access;this.audit=audit;this.planService=planService;}
    public Paged<PackageResponse> query(PackageQueryRequest req){
        log.info("query packages status={} tier={}",req.status(),req.tier());access.staff();ServicePackageExample ex=new ServicePackageExample();ex.eq("hospital_id",CurrentAccount.get().hospitalId());
        if(Checks.text(req.keyword()))ex.like("name","%"+req.keyword().trim()+"%");if(Checks.text(req.status()))ex.eq("status",req.status());if(Checks.text(req.tier()))ex.eq("tier",req.tier());if(Checks.text(req.scene()))ex.eq("scene",req.scene());
        ex.setOrderByClause("status ASC,tier ASC,id ASC");PageHelper.startPage(Paged.number(req.page()),Paged.size(req.size()));
        List<ServicePackage> rows=packages.selectByExample(ex);return Paged.of(rows,this::view);
    }
    @Transactional
    public PackageResponse save(SavePackageRequest req){
        log.info("save package id={} code={}",req.id(),req.code());access.manager();Long hospitalId=CurrentAccount.get().hospitalId();
        if(req.planId()!=null){FollowupPlan plan=plans.selectByPrimaryKey(req.planId());Checks.require(plan!=null&&hospitalId.equals(plan.hospitalId)&&!"RETIRED".equals(plan.status),"Select a usable follow-up plan / 请选择可用的随访方案");}
        ServicePackageExample duplicate=new ServicePackageExample();duplicate.eq("hospital_id",hospitalId).eq("code",req.code());if(req.id()!=null)duplicate.ne("id",req.id());
        Checks.require(packages.countByExample(duplicate)==0,"Package code already exists / 服务包编码重复");
        ServicePackage row=new ServicePackage();row.code=req.code();row.name=req.name().trim();row.disease=req.disease().trim();row.tier=req.tier();row.scene=req.scene();row.periodDays=req.periodDays();row.priceCents=req.priceCents();
        row.followupCount=req.followupCount();row.assessmentCount=req.assessmentCount();row.reviewCount=req.reviewCount();row.deviceNote=req.deviceNote();row.privilegeNote=req.privilegeNote();row.serviceHours=req.serviceHours();row.content=req.content();row.redLines=req.redLines();row.planId=req.planId();
        if(req.id()==null){row.hospitalId=hospitalId;row.status="DRAFT";row.version=0;row.creator=CurrentAccount.get().userId().toString();packages.insertSelective(row);}
        else{
            ServicePackage old=packages.selectByPrimaryKey(req.id());Checks.found(old!=null&&hospitalId.equals(old.hospitalId));Checks.conflict(req.version()!=null&&req.version().equals(old.version));
            Checks.require(!"RETIRED".equals(old.status),"Retired packages are read-only / 已下架服务包不可修改");
            row.version=old.version+1;row.modifier=CurrentAccount.get().userId().toString();ServicePackageExample ex=new ServicePackageExample();ex.eq("id",old.id).eq("hospital_id",hospitalId).eq("version",old.version);
            Checks.conflict(packages.updateByExampleSelective(row,ex)==1);row.id=old.id;
        }
        audit.append(null,req.id()==null?"PACKAGE_CREATED":"PACKAGE_UPDATED",row.id,null,row.status==null?"DRAFT":row.status,req.code()+" price="+req.priceCents());return view(packages.selectByPrimaryKey(row.id));
    }
    @Transactional
    public PackageResponse changeStatus(ChangePackageStatusRequest req){
        log.info("change package status id={} status={}",req.id(),req.status());access.manager();ServicePackage old=packages.selectByPrimaryKey(req.id());
        Checks.found(old!=null&&CurrentAccount.get().hospitalId().equals(old.hospitalId));Checks.conflict(req.version().equals(old.version));
        if("ACTIVE".equals(req.status())){Checks.require(old.planId!=null,"Link a follow-up plan before activating / 启用前请关联随访方案");planService.requireActive(old.planId);}
        ServicePackage patch=new ServicePackage();patch.status=req.status();patch.version=old.version+1;patch.modifier=CurrentAccount.get().userId().toString();
        ServicePackageExample ex=new ServicePackageExample();ex.eq("id",old.id).eq("hospital_id",old.hospitalId).eq("version",old.version);Checks.conflict(packages.updateByExampleSelective(patch,ex)==1);
        audit.append(null,"PACKAGE_STATUS_CHANGED",old.id,old.status,req.status(),"version="+patch.version);return view(packages.selectByPrimaryKey(old.id));
    }
    public ServicePackage requireActive(Long id){ServicePackage k=packages.selectByPrimaryKey(id);Checks.require(k!=null&&CurrentAccount.get().hospitalId().equals(k.hospitalId)&&"ACTIVE".equals(k.status),"Active service package required / 请选择启用中的服务包");return k;}
    PackageResponse view(ServicePackage k){
        FollowupPlan plan=k.planId==null?null:plans.selectByPrimaryKey(k.planId);
        ServiceEnrollmentExample ex=new ServiceEnrollmentExample();ex.eq("hospital_id",k.hospitalId).eq("package_id",k.id).eq("status","ACTIVE");
        return new PackageResponse(k.id,k.code,k.name,k.disease,k.tier,k.scene,k.periodDays,k.priceCents,k.followupCount,k.assessmentCount,k.reviewCount,k.deviceNote,k.privilegeNote,k.serviceHours,k.content,k.redLines,k.planId,plan==null?null:plan.name,k.status,k.version,enrollments.countByExample(ex));
    }
}
