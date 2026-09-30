package com.bgssai.health.common.aop;
import com.bgssai.health.auth.service.AccountService;
import com.bgssai.health.auth.service.CurrentAccount;
import com.bgssai.health.common.logging.MdcSupport;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
@Aspect @Component @Order(1)
public class JwtTokenAspect {
    private final AccountService accounts;
    public JwtTokenAspect(AccountService accounts) { this.accounts=accounts; }
    @Around("@within(com.bgssai.health.common.aop.NeedAop) || @annotation(com.bgssai.health.common.aop.NeedAop)")
    public Object validateJwtToken(ProceedingJoinPoint point) throws Throwable {
        var request=((ServletRequestAttributes)RequestContextHolder.currentRequestAttributes()).getRequest();
        var actor=accounts.authenticate(request.getHeader("Jwttoken"));
        CurrentAccount.set(actor); UserContext.setUserId(actor.userId().toString()); UserContext.setUserRole(actor.roleCode());
        MdcSupport.putUserContext(actor.userId().toString(),actor.hospitalId().toString());
        try { return point.proceed(); } finally { CurrentAccount.clear(); UserContext.clear(); MdcSupport.clearUserContext(); }
    }
}
