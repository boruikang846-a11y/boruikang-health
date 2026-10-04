package com.boruikang.health.auth.service;

import com.boruikang.health.auth.dto.*;
import com.boruikang.health.common.Checks;
import com.boruikang.health.common.exception.BizException;
import com.boruikang.health.mapper.HealthAccountMapper;
import com.boruikang.health.model.HealthAccount;
import com.boruikang.health.model.HealthAccountExample;
import com.boruikang.health.utils.JwtUtil;
import com.github.pagehelper.PageHelper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Service
public class AccountService {
    private static final Logger log = LoggerFactory.getLogger(AccountService.class);
    private final HealthAccountMapper accounts;
    private final String portal;
    private final Long hospitalId;
    public AccountService(HealthAccountMapper accounts, @Value("${health.portal}") String portal, @Value("${health.hospital-id}") Long hospitalId) {
        this.accounts = accounts; this.portal = portal; this.hospitalId = hospitalId;
    }
    @Transactional
    public LoginResponse login(LoginRequest request) {
        log.info("login portal={}", portal);
        HealthAccountExample ex = new HealthAccountExample(); ex.eq("username", request.identifier());
        PageHelper.startPage(1, 1, false);
        List<HealthAccount> rows = accounts.selectByExample(ex);
        if (rows.isEmpty() || !Boolean.TRUE.equals(rows.getFirst().enabled) || !request.password().equals(rows.getFirst().password))
            throw new BizException("4001", "Invalid credentials / 账号或密码错误");
        HealthAccount row = rows.getFirst();
        Checks.permit(allowed(row.roleCode));
        return issue(row);
    }
    @Transactional
    public LoginResponse register(RegisterRequest request) {
        log.info("register portal={}", portal);
        Checks.permit("user".equals(portal));
        Checks.require(Boolean.TRUE.equals(request.consent()), "Consent required / 请先阅读并同意服务与隐私说明");
        HealthAccount row = new HealthAccount(); row.username=request.username(); row.password=request.password();
        row.realName=request.realName(); row.roleCode="USER"; row.hospitalId=hospitalId; row.enabled=true; row.creator="self-registration";
        accounts.insertSelective(row);
        return issue(row);
    }
    private LoginResponse issue(HealthAccount row) {
        String sid = UUID.randomUUID().toString(); HealthAccount patch = new HealthAccount(); patch.currentSessionId=sid;
        HealthAccountExample ex = new HealthAccountExample(); ex.eq("id",row.id);
        accounts.updateByExampleSelective(patch,ex);
        String token=JwtUtil.generateSessionToken(row.id,row.realName,row.roleCode,sid);
        log.info("login succeeded portal={} accountId={}",portal,row.id);
        return new LoginResponse(token,row.id,row.realName,row.roleCode,row.hospitalId);
    }
    public AccountInfo authenticate(String token) {
        if (token == null || !JwtUtil.validateToken(token)) throw new BizException("2002", "Session expired / 请重新登录");
        Long id;
        try { id = Long.valueOf(JwtUtil.getUserIdFromToken(token)); }
        catch (NumberFormatException ex) { throw new BizException("2002", "Invalid session"); }
        HealthAccount row=accounts.selectByPrimaryKey(id);
        if (row == null || !Boolean.TRUE.equals(row.enabled) || !allowed(row.roleCode)
            || !row.roleCode.equals(JwtUtil.getRoleFromToken(token)) || row.currentSessionId == null
            || !row.currentSessionId.equals(JwtUtil.getSessionId(token))) throw new BizException("2003", "Session expired / 会话已失效，请重新登录");
        return new AccountInfo(row.id,row.realName,row.roleCode,row.hospitalId);
    }
    public AccountInfo me() { log.info("account me accountId={}",CurrentAccount.get().userId()); return CurrentAccount.get(); }
    public void logout() {
        AccountInfo actor=CurrentAccount.get(); log.info("logout accountId={}",actor.userId());
        HealthAccount patch=new HealthAccount(); patch.currentSessionId=UUID.randomUUID().toString();
        HealthAccountExample ex=new HealthAccountExample(); ex.eq("id",actor.userId()); accounts.updateByExampleSelective(patch,ex);
    }
    /** Any logged-in account changes its own password; the old login ends and a fresh one is returned. */
    @Transactional
    public LoginResponse changePassword(ChangePasswordRequest request) {
        AccountInfo actor=CurrentAccount.get(); log.info("change password accountId={}",actor.userId());
        HealthAccount row=accounts.selectByPrimaryKey(actor.userId());
        Checks.found(row != null && Boolean.TRUE.equals(row.enabled));
        Checks.require(request.oldPassword().equals(row.password), "Current password is incorrect / 原密码不正确");
        Checks.require(!request.newPassword().equals(request.oldPassword()), "New password must differ from the current one / 新密码不能与原密码相同");
        HealthAccount patch=new HealthAccount(); patch.password=request.newPassword(); patch.modifier=actor.userId().toString();
        HealthAccountExample ex=new HealthAccountExample(); ex.eq("id",row.id); accounts.updateByExampleSelective(patch,ex);
        return issue(row);
    }
    private boolean allowed(String role) {
        return "user".equals(portal) ? "USER".equals(role) : List.of("MANAGER","OPERATOR","NURSE","DOCTOR","PLATFORM_ADMIN").contains(role);
    }
}
