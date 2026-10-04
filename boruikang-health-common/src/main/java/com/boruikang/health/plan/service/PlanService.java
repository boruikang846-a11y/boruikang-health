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
import java.util.HashSet;
import java.util.List;
import java.util.Set;
/** Follow-up plan templates: an ordered node list that enrollment activation expands into dated tasks. */
@Service
public class PlanService {
    private static final Logger log=LoggerFactory.getLogger(PlanService.class);
    private final FollowupPlanMapper plans;private final FollowupPlanNodeMapper nodes;private final ServicePackageMapper packages;private final PatientAccess access;private final AuditService audit;
    public PlanService(FollowupPlanMapper plans,FollowupPlanNodeMapper nodes,ServicePackageMapper packages,PatientAccess access,AuditService audit){this.plans=plans;this.nodes=nodes;this.packages=packages;this.access=access;this.audit=audit;}
    public Paged<PlanResponse> query(PlanQueryRequest req){
        log.info("query plans status={}",req.status());access.staff();FollowupPlanExample ex=new FollowupPlanExample();ex.eq("hospital_id",CurrentAccount.get().hospitalId());
        if(Checks.text(req.keyword()))ex.like("name","%"+req.keyword().trim()+"%");if(Checks.text(req.status()))ex.eq("status",req.status());if(Checks.text(req.disease()))ex.eq("disease",req.disease());
        ex.setOrderByClause("status ASC,id DESC");PageHelper.startPage(Paged.number(req.page()),Paged.size(req.size()));
        List<FollowupPlan> rows=plans.selectByExample(ex);return Paged.of(rows,r->view(r,nodesOf(r.id)));
    }
    @Transactional
    public PlanResponse save(SavePlanRequest req){
        log.info("save plan id={} name={}",req.id(),req.name());access.manager();Long hospitalId=CurrentAccount.get().hospitalId();
        Set<Integer> seqs=new HashSet<>();for(PlanNodeDto n:req.nodes())Checks.require(seqs.add(n.seq()),"Node sequence numbers must be unique / 节点序号重复");
        FollowupPlanExample duplicate=new FollowupPlanExample();duplicate.eq("hospital_id",hospitalId).eq("name",req.name().trim());if(req.id()!=null)duplicate.ne("id",req.id());
        Checks.require(plans.countByExample(duplicate)==0,"Plan name already exists / 方案名称重复");
        FollowupPlan row=new FollowupPlan();row.name=req.name().trim();row.disease=req.disease().trim();row.entryScene=req.entryScene();row.description=req.description();
        if(req.id()==null){row.hospitalId=hospitalId;row.status="DRAFT";row.version=0;row.creator=CurrentAccount.get().userId().toString();plans.insertSelective(row);}
        else{
            FollowupPlan old=plans.selectByPrimaryKey(req.id());Checks.found(old!=null&&hospitalId.equals(old.hospitalId));Checks.conflict(req.version()!=null&&req.version().equals(old.version));
            Checks.require(!"RETIRED".equals(old.status),"Retired plans are read-only / 已停用方案不可修改");
            row.version=old.version+1;row.modifier=CurrentAccount.get().userId().toString();FollowupPlanExample ex=new FollowupPlanExample();ex.eq("id",old.id).eq("hospital_id",hospitalId).eq("version",old.version);
            Checks.conflict(plans.updateByExampleSelective(row,ex)==1);row.id=old.id;
            FollowupPlanNodeExample nx=new FollowupPlanNodeExample();nx.eq("plan_id",old.id);FollowupPlanNode gone=new FollowupPlanNode();gone.delFlag=true;gone.modifier=row.modifier;nodes.updateByExampleSelective(gone,nx);
        }
        for(PlanNodeDto n:req.nodes()){
            FollowupPlanNode node=new FollowupPlanNode();node.hospitalId=hospitalId;node.planId=row.id;node.seq=n.seq();node.stage=n.stage();node.offsetDays=n.offsetDays();node.taskType=n.taskType();node.title=n.title().trim();node.priority=n.priority();node.checklist=n.checklist();node.creator=CurrentAccount.get().userId().toString();
            nodes.insertSelective(node);
        }
        audit.append(null,req.id()==null?"PLAN_CREATED":"PLAN_UPDATED",row.id,null,row.status==null?"DRAFT":row.status,"nodes="+req.nodes().size());
        return view(plans.selectByPrimaryKey(row.id),nodesOf(row.id));
    }
    @Transactional
    public PlanResponse changeStatus(ChangePlanStatusRequest req){
        log.info("change plan status id={} status={}",req.id(),req.status());access.manager();FollowupPlan old=plans.selectByPrimaryKey(req.id());
        Checks.found(old!=null&&CurrentAccount.get().hospitalId().equals(old.hospitalId));Checks.conflict(req.version().equals(old.version));
        if("RETIRED".equals(req.status())){ServicePackageExample px=new ServicePackageExample();px.eq("hospital_id",old.hospitalId).eq("plan_id",old.id).eq("status","ACTIVE");Checks.require(packages.countByExample(px)==0,"Active packages still use this plan / 仍有启用中的服务包引用该方案");}
        FollowupPlan patch=new FollowupPlan();patch.status=req.status();patch.version=old.version+1;patch.modifier=CurrentAccount.get().userId().toString();
        FollowupPlanExample ex=new FollowupPlanExample();ex.eq("id",old.id).eq("hospital_id",old.hospitalId).eq("version",old.version);Checks.conflict(plans.updateByExampleSelective(patch,ex)==1);
        audit.append(null,"PLAN_STATUS_CHANGED",old.id,old.status,req.status(),"version="+patch.version);return view(plans.selectByPrimaryKey(old.id),nodesOf(old.id));
    }
    public FollowupPlan requireActive(Long id){FollowupPlan p=plans.selectByPrimaryKey(id);Checks.require(p!=null&&CurrentAccount.get().hospitalId().equals(p.hospitalId)&&"ACTIVE".equals(p.status),"Select an active follow-up plan / 请选择启用中的随访方案");return p;}
    public List<FollowupPlanNode> nodesOf(Long planId){FollowupPlanNodeExample ex=new FollowupPlanNodeExample();ex.eq("plan_id",planId);ex.setOrderByClause("seq ASC");PageHelper.startPage(1,100,false);return nodes.selectByExample(ex);}
    static PlanResponse view(FollowupPlan p,List<FollowupPlanNode> ns){
        return new PlanResponse(p.id,p.name,p.disease,p.entryScene,p.description,p.status,p.version,ns.stream().map(n->new PlanNodeDto(n.seq,n.stage,n.offsetDays,n.taskType,n.title,n.priority,n.checklist)).toList());
    }
}
