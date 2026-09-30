package com.bgssai.health.auth.service;
import com.bgssai.health.auth.dto.AccountInfo;
import com.bgssai.health.common.exception.BizException;
public final class CurrentAccount {
    private static final ThreadLocal<AccountInfo> ACCOUNT = new ThreadLocal<>();
    private CurrentAccount() {}
    public static AccountInfo get() { AccountInfo value = ACCOUNT.get(); if (value == null) throw new BizException("2002", "Login required"); return value; }
    public static void set(AccountInfo value) { ACCOUNT.set(value); }
    public static void clear() { ACCOUNT.remove(); }
}
