package com.boruikang.health.common.aop;

/**
 * Request-scoped user identity context backed by ThreadLocal.
 * Populated by JwtTokenAspect; cleared in the aspect's finally block.
 */
public class UserContext {

    private static final ThreadLocal<String> userId = new ThreadLocal<>();
    private static final ThreadLocal<String> realName = new ThreadLocal<>();
    private static final ThreadLocal<String> userAccountType = new ThreadLocal<>();
    private static final ThreadLocal<String> userCompanyCode = new ThreadLocal<>();
    private static final ThreadLocal<String> userCompanyName = new ThreadLocal<>();
    private static final ThreadLocal<String> userRole = new ThreadLocal<>();

    public static void setUserId(String id) {
        userId.set(id);
    }

    public static String getUserId() {
        return userId.get();
    }

    public static void setRealName(String name) {
        realName.set(name);
    }

    public static String getRealName() {
        return realName.get();
    }

    public static void setUserAccountType(String accountType) {
        userAccountType.set(accountType);
    }

    public static String getUserAccountType() {
        return userAccountType.get();
    }

    public static void setUserCompanyCode(String companyCode) {
        userCompanyCode.set(companyCode);
    }

    public static String getUserCompanyCode() {
        return userCompanyCode.get();
    }

    public static void setUserCompanyName(String companyName) {
        userCompanyName.set(companyName);
    }

    public static String getUserCompanyName() {
        return userCompanyName.get();
    }

    public static void setUserRole(String role) {
        userRole.set(role);
    }

    public static String getUserRole() {
        return userRole.get();
    }

    public static void clear() {
        userId.remove();
        realName.remove();
        userAccountType.remove();
        userCompanyCode.remove();
        userCompanyName.remove();
        userRole.remove();
    }
}
