package com.bgssai.health.account.service;

import com.bgssai.health.account.dto.*;
import com.bgssai.health.audit.service.AuditService;
import com.bgssai.health.auth.service.CurrentAccount;
import com.bgssai.health.common.Checks;
import com.bgssai.health.common.Paged;
import com.bgssai.health.mapper.HealthAccountMapper;
import com.bgssai.health.model.HealthAccount;
import com.bgssai.health.model.HealthAccountExample;
import com.bgssai.health.patient.service.PatientAccess;
import com.github.pagehelper.PageHelper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

/** The operations manager opens and maintains doctor, nurse and operator logins of the hospital. */
@Service
public class StaffAccountService {
    private static final Logger log=LoggerFactory.getLogger(StaffAccountService.class);
    public static final List<String> MANAGED_ROLES=List.of("DOCTOR","NURSE","OPERATOR");
    private final HealthAccountMapper accounts;private final PatientAccess access;private final AuditService audit;
    public StaffAccountService(HealthAccountMapper accounts,PatientAccess access,AuditService audit){this.accounts=accounts;this.access=access;this.audit=audit;}
    public Paged<StaffAccountResponse> query(StaffAccountQueryRequest req){
        log.info("query staff accounts role={} enabled={}",req.roleCode(),req.enabled());access.manager();
        HealthAccountExample ex=new HealthAccountExample();ex.eq("hospital_id",CurrentAccount.get().hospitalId());
        if(Checks.text(req.roleCode()))ex.eq("role_code",req.roleCode());else ex.in("role_code",PatientAccess.STAFF);
        if(Checks.text(req.keyword()))ex.like("real_name","%"+req.keyword().trim()+"%");
        if(req.enabled()!=null)ex.eq("is_enabled",req.enabled());
        ex.selectColumns("id","username","real_name","role_code","department","is_enabled","gmt_create");ex.setOrderByClause("role_code ASC,id ASC");
        PageHelper.startPage(Paged.number(req.page()),Paged.size(req.size()));
        List<HealthAccount> rows=accounts.selectByExample(ex);return Paged.of(rows,StaffAccountService::view);
    }
    @Transactional
    public StaffAccountResponse create(CreateStaffAccountRequest req){
        log.info("create staff account role={}",req.roleCode());access.manager();
        Checks.oneOf(req.roleCode(),MANAGED_ROLES.toArray(String[]::new));
        String department=Checks.text(req.department())?req.department().trim():null;
        Checks.require(department!=null||"OPERATOR".equals(req.roleCode()),"Department required for doctors and nurses / 医生、护士请填写科室");
        HealthAccountExample duplicate=new HealthAccountExample();duplicate.eq("username",req.username());
        Checks.require(accounts.countByExample(duplicate)==0,"Username already exists / 账号已存在，请换一个");
        HealthAccount row=new HealthAccount();row.username=req.username();row.password=req.password();row.realName=req.realName().trim();row.roleCode=req.roleCode();
        row.hospitalId=CurrentAccount.get().hospitalId();row.department=department;row.enabled=true;row.creator=CurrentAccount.get().userId().toString();
        accounts.insertSelective(row);
        audit.append(null,"STAFF_ACCOUNT_CREATED",row.id,null,row.roleCode,"username="+row.username);
        return view(accounts.selectByPrimaryKey(row.id));
    }
    @Transactional
    public StaffAccountResponse changeStatus(ChangeStaffStatusRequest req){
        log.info("change staff account status id={} enabled={}",req.id(),req.enabled());access.manager();HealthAccount row=managed(req.id());
        HealthAccount patch=new HealthAccount();patch.enabled=req.enabled();patch.modifier=CurrentAccount.get().userId().toString();
        // Disabling ends the current login at once; enabling needs a fresh login.
        patch.currentSessionId=UUID.randomUUID().toString();
        update(row,patch);
        audit.append(null,Boolean.TRUE.equals(req.enabled())?"STAFF_ACCOUNT_ENABLED":"STAFF_ACCOUNT_DISABLED",row.id,Boolean.TRUE.equals(row.enabled)?"ENABLED":"DISABLED",Boolean.TRUE.equals(req.enabled())?"ENABLED":"DISABLED","username="+row.username);
        return view(accounts.selectByPrimaryKey(row.id));
    }
    @Transactional
    public StaffAccountResponse resetPassword(ResetStaffPasswordRequest req){
        log.info("reset staff password id={}",req.id());access.manager();HealthAccount row=managed(req.id());
        HealthAccount patch=new HealthAccount();patch.password=req.password();patch.currentSessionId=UUID.randomUUID().toString();patch.modifier=CurrentAccount.get().userId().toString();
        update(row,patch);audit.append(null,"STAFF_PASSWORD_RESET",row.id,null,null,"username="+row.username);
        return view(accounts.selectByPrimaryKey(row.id));
    }
    /** Only doctor, nurse and operator accounts of the manager's own hospital can be changed here. */
    private HealthAccount managed(Long id){
        HealthAccount row=accounts.selectByPrimaryKey(id);
        Checks.found(row!=null&&CurrentAccount.get().hospitalId().equals(row.hospitalId));
        Checks.permit(MANAGED_ROLES.contains(row.roleCode)&&!row.id.equals(CurrentAccount.get().userId()));
        return row;
    }
    private void update(HealthAccount row,HealthAccount patch){
        HealthAccountExample ex=new HealthAccountExample();ex.eq("id",row.id).eq("hospital_id",row.hospitalId);
        Checks.conflict(accounts.updateByExampleSelective(patch,ex)==1);
    }
    private static StaffAccountResponse view(HealthAccount a){return new StaffAccountResponse(a.id,a.username,a.realName,a.roleCode,a.department,a.enabled,a.gmtCreate);}
}
