package com.bgssai.health.patient.service;

import com.bgssai.health.audit.service.AuditService;
import com.bgssai.health.auth.dto.AccountInfo;
import com.bgssai.health.auth.service.CurrentAccount;
import com.bgssai.health.common.*;
import com.bgssai.health.mapper.*;
import com.bgssai.health.model.*;
import com.bgssai.health.patient.dto.*;
import com.bgssai.health.task.service.OutreachService;
import com.github.pagehelper.PageHelper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;

@Service
public class PatientService {
    private static final Logger log=LoggerFactory.getLogger(PatientService.class);
    public static final List<String> LIFECYCLES=List.of("ENROLLED","CONTACTED","BOOKED","ARRIVED","MANAGING","REVISIT_DUE","PAUSED","TRANSFERRED","LOST","CLOSED");
    private final PatientMapper patients; private final HealthAccountMapper accounts; private final CareTaskMapper tasks;
    private final IntakeChannelMapper channels; private final ServicePackageMapper packages; private final CareOrgMapper orgs; private final PatientAccess access; private final AuditService audit; private final OutreachService outreach;
    public PatientService(PatientMapper patients,HealthAccountMapper accounts,CareTaskMapper tasks,IntakeChannelMapper channels,
        ServicePackageMapper packages,CareOrgMapper orgs,PatientAccess access,AuditService audit,OutreachService outreach) {
        this.patients=patients;this.accounts=accounts;this.tasks=tasks;this.channels=channels;this.packages=packages;this.orgs=orgs;this.access=access;this.audit=audit;this.outreach=outreach;
    }
    public Paged<PatientResponse> query(PatientQueryRequest req) {
        log.info("query patients page={} lifecycle={} scene={}",req.page(),req.lifecycle(),req.sourceScene());PatientExample ex=access.scope();
        if (Checks.text(req.keyword())) ex.like("name","%"+req.keyword().trim()+"%");
        if (Checks.text(req.riskLevel())) ex.eq("risk_level",req.riskLevel());
        if (Checks.text(req.department())) ex.eq("department",req.department());
        if (Checks.text(req.lifecycle())) ex.eq("lifecycle",req.lifecycle());
        if (Checks.text(req.sourceScene())) ex.eq("source_scene",req.sourceScene());
        if (req.orgId()!=null) ex.eq("org_id",req.orgId());
        if (req.ownerId()!=null) ex.eq("owner_id",req.ownerId());
        if (req.doctorId()!=null) ex.eq("doctor_id",req.doctorId());
        if (Checks.text(req.tag())) ex.like("tags","%,"+req.tag().trim()+",%");
        if (req.createdFrom()!=null) ex.ge("gmt_create",req.createdFrom().atStartOfDay());
        if (req.createdTo()!=null) ex.lt("gmt_create",req.createdTo().plusDays(1).atStartOfDay());
        if (req.contactFrom()!=null) ex.ge("last_contact_at",req.contactFrom().atStartOfDay());
        if (req.contactTo()!=null) ex.lt("last_contact_at",req.contactTo().plusDays(1).atStartOfDay());
        // Task-derived filters: collect the matching patient ids first (bounded), then restrict the patient query.
        if (Boolean.TRUE.equals(req.overdue())||Boolean.TRUE.equals(req.openAlert())||Boolean.TRUE.equals(req.revisitPending())) {
            CareTaskExample tx=access.taskScope();tx.ne("status","COMPLETED").ne("status","CANCELLED");
            if (Boolean.TRUE.equals(req.overdue())) tx.lt("due_at",LocalDateTime.now());
            if (Boolean.TRUE.equals(req.openAlert())) tx.eq("task_type","ALERT");
            if (Boolean.TRUE.equals(req.revisitPending())) tx.eq("task_type","REVISIT");
            tx.selectColumns("id","patient_id");tx.setOrderByClause("id DESC");
            PageHelper.startPage(1,2000,false);
            List<Long> ids=tasks.selectByExample(tx).stream().map(t->t.patientId).distinct().toList();
            ex.in("id",ids);
        }
        ex.setOrderByClause("id DESC");
        PageHelper.startPage(Paged.number(req.page()),Paged.size(req.size()));
        List<Patient> rows=patients.selectByExample(ex);
        return Paged.of(rows,r->view(r,true));
    }
    public PatientResponse detail(Long id) { log.info("patient detail patientId={}",id);access.staff();return view(access.require(id),false); }
    public PatientResponse profile() { log.info("patient profile accountId={}",CurrentAccount.get().userId());Patient p=access.own(false);return p==null?null:view(p,false); }
    @Transactional
    public PatientResponse create(CreatePatientRequest req) { return create(req,"MANUAL",null); }
    @Transactional
    public ImportPatientsResponse importRows(ImportPatientsRequest req) {
        log.info("import patient file batch={} rows={}",req.importBatch(),req.rows().size());
        access.operations();var actor=CurrentAccount.get();
        if(access.executor())Checks.permit(actor.userId().equals(req.ownerId()));
        validateClinician(req.doctorId());validateStaff(req.ownerId(),"OPERATOR","NURSE","MANAGER");validateOrg(req.orgId());
        int created=0,skipped=0;List<String> messages=new ArrayList<>();
        for(int i=0;i<req.rows().size();i++) {
            var row=req.rows().get(i);
            String sourceId=Checks.text(row.externalId())?"E:"+row.externalId().trim():"B:"+req.importBatch()+":"+(i+1);
            PatientExample duplicate=new PatientExample();duplicate.eq("hospital_id",actor.hospitalId()).eq("source_system","FILE_IMPORT").eq("hospital_patient_id",sourceId);
            if(patients.countByExample(duplicate)>0) {
                skipped++;messages.add("第"+(i+1)+"行：来源编号或该批次记录已存在，跳过");continue;
            }
            String idCard=Checks.text(row.idCard())?row.idCard().trim().toUpperCase(java.util.Locale.ROOT):null;
            if(idCard!=null) {
                PatientExample identity=new PatientExample();identity.eq("hospital_id",actor.hospitalId()).eq("id_card",idCard);
                if(patients.countByExample(identity)>0) {
                    skipped++;messages.add("第"+(i+1)+"行：证件号已存在，跳过");continue;
                }
            }
            CreatePatientRequest patient=new CreatePatientRequest(row.name().trim(),row.gender()==null?"UNKNOWN":row.gender(),row.age(),row.phone().trim(),
                row.department().trim(),row.disease().trim(),req.doctorId(),req.ownerId(),row.note(),idCard,row.birthDate(),row.address(),row.emergencyContact(),
                row.emergencyPhone(),row.inpatientNo(),row.bedNo(),req.patientType(),req.sourceScene(),req.orgId(),null,null,null,"UNKNOWN",null,!Boolean.FALSE.equals(req.outreach()));
            create(patient,"FILE_IMPORT",sourceId);created++;
        }
        audit.append(null,"PATIENT_FILE_IMPORTED",null,null,"IMPORTED","batch="+req.importBatch()+"; created="+created+"; skipped="+skipped);
        return new ImportPatientsResponse(req.importBatch(),created,skipped,messages);
    }
    @Transactional
    public PatientResponse importHospital(CreatePatientRequest req,String sourceSystem,String externalId) {
        access.manager();Checks.require("HOSPITAL_MOCK".equals(sourceSystem)&&Checks.text(externalId),"Invalid hospital source");
        return create(req,sourceSystem,externalId);
    }
    private PatientResponse create(CreatePatientRequest req,String sourceSystem,String externalId) {
        log.info("create patient actorId={} scene={}",CurrentAccount.get().userId(),req.sourceScene());access.operations();var actor=CurrentAccount.get();
        Long doctorId=req.doctorId(), ownerId=req.ownerId();
        if (access.executor()) { Checks.permit(ownerId==null||actor.userId().equals(ownerId));ownerId=actor.userId(); }
        validateClinician(doctorId); validateStaff(ownerId,"OPERATOR","NURSE","MANAGER"); validateClinician(req.referrerId()); validateOrg(req.orgId()); validateChannel(req.channelId());
        Checks.require(req.riskLevel()==null||"UNKNOWN".equals(req.riskLevel())||Checks.text(req.riskEvidence()),"Record hospital clinical assessment evidence / 请记录院方风险评估依据");
        Patient p=new Patient();p.hospitalId=actor.hospitalId();p.name=req.name().trim();p.gender=req.gender();p.age=req.age();p.phone=req.phone();
        p.department=req.department();p.disease=req.disease();p.doctorId=doctorId;p.ownerId=ownerId;p.note=req.note();p.creator=actor.userId().toString();
        p.sourceSystem=sourceSystem;p.hospitalPatientId=externalId;
        p.idCard=req.idCard();p.birthDate=req.birthDate();p.address=req.address();p.emergencyContact=req.emergencyContact();p.emergencyPhone=req.emergencyPhone();
        p.inpatientNo=req.inpatientNo();p.bedNo=req.bedNo();p.patientType=req.patientType()==null?"UNKNOWN":req.patientType();p.sourceScene=req.sourceScene()==null?"MANUAL":req.sourceScene();
        p.orgId=req.orgId();p.referrerId=req.referrerId();p.channelId=req.channelId();p.tags=tagsColumn(req.tags());
        p.riskLevel=req.riskLevel()==null?"UNKNOWN":req.riskLevel();p.lifecycle="ENROLLED";p.version=0;patients.insertSelective(p);
        audit.append(p.id,"PATIENT_CREATED",p.id,null,"ENROLLED","Source="+sourceSystem+"; scene="+p.sourceScene+(Checks.text(req.riskEvidence())?"; risk evidence recorded":""));
        Patient saved=access.lock(p.id);
        if(Boolean.TRUE.equals(req.outreach()))outreach.open(saved,"outreach-patient-"+saved.id,"Opened at patient creation");
        return view(saved,false);
    }
    @Transactional
    public PatientResponse update(UpdatePatientRequest req) {
        log.info("update patient patientId={} lifecycle={}",req.id(),req.lifecycle());access.operations();Patient p=access.lock(req.id());Checks.conflict(req.version().equals(p.version));
        if ((req.doctorId()!=null&&!Objects.equals(req.doctorId(),p.doctorId))||(req.ownerId()!=null&&!Objects.equals(req.ownerId(),p.ownerId))) access.manager();
        if (req.riskLevel()!=null&&!req.riskLevel().equals(p.riskLevel)) Checks.require(Checks.text(req.riskEvidence()),"Record hospital clinical assessment evidence / 请记录院方风险评估依据");
        if (req.lifecycle()!=null&&!req.lifecycle().equals(p.lifecycle)&&List.of("PAUSED","TRANSFERRED","LOST","CLOSED").contains(req.lifecycle())) Checks.require(Checks.text(req.lifecycleReason()),"Record why the patient leaves active management / 请填写暂缓、转出、失访或结案原因");
        validateClinician(req.doctorId()); validateStaff(req.ownerId(),"OPERATOR","NURSE","MANAGER"); validateClinician(req.referrerId()); validateOrg(req.orgId());
        if (req.servicePackageId()!=null) {
            ServicePackage k=packages.selectByPrimaryKey(req.servicePackageId());
            Checks.require(k!=null&&p.hospitalId.equals(k.hospitalId)&&"ACTIVE".equals(k.status),"Active service package required / 请选择启用中的服务包");
        }
        Patient patch=new Patient();patch.doctorId=req.doctorId();patch.ownerId=req.ownerId();patch.lifecycle=req.lifecycle();patch.riskLevel=req.riskLevel();
        patch.note=req.note();patch.servicePackageId=req.servicePackageId();patch.version=p.version+1;patch.modifier=CurrentAccount.get().userId().toString();
        patch.name=req.name()==null?null:req.name().trim();patch.gender=req.gender();patch.age=req.age();patch.phone=req.phone();patch.department=req.department();patch.disease=req.disease();
        patch.idCard=req.idCard();patch.birthDate=req.birthDate();patch.address=req.address();patch.emergencyContact=req.emergencyContact();patch.emergencyPhone=req.emergencyPhone();
        patch.inpatientNo=req.inpatientNo();patch.bedNo=req.bedNo();patch.patientType=req.patientType();patch.sourceScene=req.sourceScene();patch.orgId=req.orgId();patch.referrerId=req.referrerId();
        patch.tags=req.tags()==null?null:tagsColumn(req.tags());
        if ("LOST".equals(req.lifecycle())&&!"LOST".equals(p.lifecycle)) patch.lostSince=LocalDateTime.now();
        PatientExample ex=new PatientExample();ex.eq("id",p.id).eq("hospital_id",p.hospitalId).eq("version",p.version);
        Checks.conflict(patients.updateByExampleSelective(patch,ex)==1);
        boolean doctorChanged=patch.doctorId!=null&&!Objects.equals(patch.doctorId,p.doctorId);
        boolean ownerChanged=patch.ownerId!=null&&!Objects.equals(patch.ownerId,p.ownerId);
        if (doctorChanged||ownerChanged) {
            long cursor=0;
            while(true) {
                CareTaskExample tx=new CareTaskExample();tx.eq("hospital_id",p.hospitalId).eq("patient_id",p.id).ge("id",cursor+1);
                tx.setOrderByClause("id ASC");
                PageHelper.startPage(1,100,false);
                List<CareTask> batch=tasks.selectByExample(tx);
                if(batch.isEmpty())break;
                for(CareTask task:batch) {
                    CareTask taskPatch=new CareTask();taskPatch.doctorId=patch.doctorId;taskPatch.assigneeId=patch.ownerId;
                    taskPatch.version=task.version+1;taskPatch.modifier=CurrentAccount.get().userId().toString();
                    if(doctorChanged&&List.of("PENDING_REVIEW","APPROVED").contains(task.status)) {
                        taskPatch.status="IN_PROGRESS";taskPatch.approvedText="";taskPatch.reviewNote="责任医生变更，请重新提交审核";
                    }
                    CareTaskExample condition=new CareTaskExample();condition.eq("id",task.id).eq("hospital_id",p.hospitalId).eq("version",task.version);
                    Checks.conflict(tasks.updateByExampleSelective(taskPatch,condition)==1);
                    audit.append(p.id,"TASK_REASSIGNED",task.id,task.status,taskPatch.status==null?task.status:taskPatch.status,"version="+taskPatch.version);
                    cursor=task.id;
                }
            }
        }
        audit.append(p.id,"PATIENT_UPDATED",p.id,p.lifecycle,req.lifecycle(),Checks.text(req.riskEvidence())?"Hospital risk evidence: "+req.riskEvidence():Checks.text(req.lifecycleReason())?"Lifecycle reason: "+req.lifecycleReason():"Profile or assignment updated");
        return view(patients.selectByPrimaryKey(p.id),false);
    }
    @Transactional
    public PatientResponse consent(ConsentRequest req) {
        log.info("record consent patientId={} version={}",req.id(),req.consentVersion());access.operations();Patient p=access.lock(req.id());Checks.conflict(req.version().equals(p.version));
        Patient patch=new Patient();patch.consentAt=req.consentAt();patch.consentVersion=req.consentVersion().trim();patch.consentEvidence=req.consentEvidence().trim();patch.version=p.version+1;patch.modifier=CurrentAccount.get().userId().toString();
        PatientExample ex=new PatientExample();ex.eq("id",p.id).eq("hospital_id",p.hospitalId).eq("version",p.version);Checks.conflict(patients.updateByExampleSelective(patch,ex)==1);
        audit.append(p.id,"CONSENT_RECORDED",p.id,null,"CONSENTED","version="+req.consentVersion());return view(patients.selectByPrimaryKey(p.id),false);
    }
    /** Lifecycle advance driven by operations actions; never moves a patient backwards or out of a terminal state. */
    @Transactional
    public void advance(Patient locked,String lifecycle,String reason) {
        int current=LIFECYCLES.indexOf(locked.lifecycle), target=LIFECYCLES.indexOf(lifecycle);
        if (target<0||current>=LIFECYCLES.indexOf("PAUSED")||target<=current) return;
        Patient patch=new Patient();patch.lifecycle=lifecycle;patch.version=locked.version+1;patch.modifier=CurrentAccount.get().userId().toString();
        if (List.of("CONTACTED","BOOKED","ARRIVED").contains(lifecycle)) patch.lastContactAt=LocalDateTime.now();
        PatientExample ex=new PatientExample();ex.eq("id",locked.id).eq("hospital_id",locked.hospitalId).eq("version",locked.version);
        Checks.conflict(patients.updateByExampleSelective(patch,ex)==1);locked.version=patch.version;locked.lifecycle=lifecycle;
        audit.append(locked.id,"PATIENT_LIFECYCLE_ADVANCED",locked.id,LIFECYCLES.get(current),lifecycle,reason);
    }
    @Transactional
    public void touchContact(Patient locked,LocalDateTime at) {
        Patient patch=new Patient();patch.lastContactAt=at;patch.version=locked.version+1;patch.modifier=CurrentAccount.get().userId().toString();
        PatientExample ex=new PatientExample();ex.eq("id",locked.id).eq("hospital_id",locked.hospitalId).eq("version",locked.version);
        Checks.conflict(patients.updateByExampleSelective(patch,ex)==1);locked.version=patch.version;locked.lastContactAt=at;
    }
    @Transactional
    public PatientResponse enroll(EnrollRequest req) {
        log.info("enroll patient accountId={}",CurrentAccount.get().userId());Checks.require(Boolean.TRUE.equals(req.consent()),"Consent required");
        Patient existing=access.own(false);if(existing!=null)return view(existing,false);
        var actor=CurrentAccount.get(); IntakeChannel channel=null;
        if (Checks.text(req.token())) {
            IntakeChannelExample ex=new IntakeChannelExample();ex.eq("token",req.token()).eq("is_active",true).eq("hospital_id",actor.hospitalId());
            PageHelper.startPage(1,1,false);
            List<IntakeChannel> rows=channels.selectByExample(ex);Checks.found(!rows.isEmpty());channel=rows.getFirst();
        }
        Patient p=new Patient();p.accountId=actor.userId();p.hospitalId=actor.hospitalId();p.name=req.name().trim();p.gender=req.gender();p.age=req.age();p.phone=req.phone();
        p.department=channel==null?"综合服务":channel.department;p.disease="待医师确认";p.riskLevel="UNKNOWN";p.lifecycle="ENROLLED";p.version=0;
        p.consentAt=LocalDateTime.now();p.creator=actor.userId().toString();
        if(channel!=null) { p.channelId=channel.id;p.doctorId=channel.doctorId;p.ownerId=channel.ownerId; }
        patients.insertSelective(p);
        CareTask task=new CareTask();task.hospitalId=p.hospitalId;task.patientId=p.id;task.taskType="FOLLOWUP";task.title="新入组首次联系";
        task.priority="P2";task.status="PENDING";task.assigneeId=p.ownerId;task.doctorId=p.doctorId;task.dueAt=LocalDateTime.now().plusDays(1);
        task.requestKey="enroll-"+p.id;task.version=0;task.creator=p.creator;tasks.insertSelective(task);
        audit.append(p.id,"PATIENT_ENROLLED",p.id,null,"ENROLLED","Consent HEALTH-MVP-1; channel="+(channel==null?"DIRECT":channel.id));
        return view(patients.selectByPrimaryKey(p.id),false);
    }
    public List<AccountInfo> staff() {
        log.info("list staff hospitalId={}",CurrentAccount.get().hospitalId());access.staff();
        HealthAccountExample ex=new HealthAccountExample();ex.eq("hospital_id",CurrentAccount.get().hospitalId()).eq("is_enabled",true)
            .in("role_code",PatientAccess.OWNERS);ex.selectColumns("id","real_name","role_code","hospital_id");
        PageHelper.startPage(1,100,false);
        List<HealthAccount> rows=accounts.selectByExample(ex);
        return rows.stream().map(r->new AccountInfo(r.id,r.realName,r.roleCode,r.hospitalId)).toList();
    }
    public void validateStaff(Long id,String... roles) {
        if(id==null)return;HealthAccount a=accounts.selectByPrimaryKey(id);
        Checks.require(a!=null&&CurrentAccount.get().hospitalId().equals(a.hospitalId)&&Boolean.TRUE.equals(a.enabled)&&List.of(roles).contains(a.roleCode),"Invalid staff assignment / 请选择本院启用中的运营人员或护士");
    }
    public void validateOrg(Long id) {
        if(id==null)return;CareOrg o=orgs.selectByPrimaryKey(id);
        Checks.require(o!=null&&CurrentAccount.get().hospitalId().equals(o.hospitalId)&&Boolean.TRUE.equals(o.active),"Select an active organisation / 请选择本院有效机构");
    }
    private void validateChannel(Long id) {
        if(id==null)return;IntakeChannel c=channels.selectByPrimaryKey(id);
        Checks.require(c!=null&&CurrentAccount.get().hospitalId().equals(c.hospitalId),"Select a channel of this hospital / 请选择本院渠道");
    }
    /** Doctor accounts of this hospital, including disabled ones so historical names still resolve. */
    public List<ClinicianInfo> clinicians() {
        access.staff();HealthAccountExample ex=new HealthAccountExample();ex.eq("hospital_id",CurrentAccount.get().hospitalId()).eq("role_code","DOCTOR");
        ex.selectColumns("id","real_name","department","is_enabled");ex.setOrderByClause("id ASC");
        PageHelper.startPage(1,200,false);
        return accounts.selectByExample(ex).stream().map(r->new ClinicianInfo(r.id,r.realName,r.department,Boolean.TRUE.equals(r.enabled))).toList();
    }
    /** A responsible, referring or feedback doctor must be an enabled DOCTOR account of this hospital. */
    public HealthAccount validateClinician(Long id) {
        if(id==null)return null;
        HealthAccount row=accounts.selectByPrimaryKey(id);
        Checks.require(row!=null&&CurrentAccount.get().hospitalId().equals(row.hospitalId)&&"DOCTOR".equals(row.roleCode)&&Boolean.TRUE.equals(row.enabled),"Select an enabled doctor account of this hospital / 请选择本院启用中的医生账号");
        return row;
    }
    public static String tagsColumn(List<String> tags) {
        if(tags==null)return null;List<String> clean=tags.stream().map(String::trim).filter(t->!t.isEmpty()&&!t.contains(",")).distinct().toList();
        return clean.isEmpty()?"":","+String.join(",",clean)+",";
    }
    public static List<String> tagsList(String column) {
        if(!Checks.text(column))return List.of();return Arrays.stream(column.split(",")).filter(t->!t.isBlank()).toList();
    }
    public static String maskName(String name){return name!=null&&name.length()>1?name.substring(0,1)+"*".repeat(name.length()-1):name;}
    public static String maskPhone(String phone){return phone!=null&&phone.length()>7?phone.substring(0,3)+"****"+phone.substring(phone.length()-4):phone;}
    public static String maskIdCard(String idCard){return idCard!=null&&idCard.length()>10?idCard.substring(0,6)+"*".repeat(idCard.length()-10)+idCard.substring(idCard.length()-4):idCard;}
    public static PatientResponse view(Patient p,boolean masked) {
        boolean staffDetail=!masked&&!"USER".equals(CurrentAccount.get().roleCode());
        return new PatientResponse(p.id,masked?maskName(p.name):p.name,p.gender,p.age,masked?maskPhone(p.phone):p.phone,p.department,p.disease,p.riskLevel,p.lifecycle,p.doctorId,p.ownerId,p.channelId,p.servicePackageId,p.consentAt,
            staffDetail?p.note:null,p.version,p.gmtCreate,p.sourceSystem,p.hospitalPatientId,
            masked?maskIdCard(p.idCard):p.idCard,p.birthDate,masked?null:p.address,masked?null:p.emergencyContact,masked?maskPhone(p.emergencyPhone):p.emergencyPhone,p.inpatientNo,p.bedNo,
            p.patientType,p.sourceScene,p.orgId,p.referrerId,p.lastContactAt,p.lostSince,p.consentVersion,staffDetail?p.consentEvidence:null,tagsList(p.tags));
    }
}
