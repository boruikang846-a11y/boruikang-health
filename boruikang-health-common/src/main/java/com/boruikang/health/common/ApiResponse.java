package com.boruikang.health.common;

/**
 * Unified response wrapper.
 */
public class ApiResponse<T> {

    private String code;

    private String message;

    private boolean success;

    private T result;

    public static <T> ApiResponse<T> ok(T result) {
        ApiResponse<T> response = new ApiResponse<>();
        response.code = "0"; response.message = "OK"; response.success = true; response.result = result;
        return response;
    }
    public static <T> ApiResponse<T> fail(String code, String message) {
        ApiResponse<T> response = new ApiResponse<>();
        response.code = code; response.message = message; response.success = false;
        return response;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public T getResult() {
        return result;
    }

    public void setResult(T result) {
        this.result = result;
    }

    @Override
    public String toString() {
        return "ApiResponse [code=" + code + ", message=" + message + ", success=" + success + ", result=" + result + "]";
    }
}
