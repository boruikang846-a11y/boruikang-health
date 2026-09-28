package com.bgssai.health.common;

import java.io.Serializable;

import com.bgssai.health.common.page.Paging;

/**
 * Paginated response wrapper.
 */
public class PageResponse implements Serializable {

    private static final long serialVersionUID = -351850803851330520L;

    private String code;

    private String message;

    private boolean success;

    private Object result;

    private Integer pageNum;

    private Integer pageSize;

    private Long totalSize;

    private Paging paging;

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

    public Object getResult() {
        return result;
    }

    public void setResult(Object result) {
        this.result = result;
    }

    public int getPageNum() {
        return pageNum;
    }

    public void setPageNum(int pageNum) {
        this.pageNum = pageNum;
    }

    public int getPageSize() {
        return pageSize;
    }

    public void setPageSize(int pageSize) {
        this.pageSize = pageSize;
    }

    public long getTotalSize() {
        return totalSize;
    }

    public void setTotalSize(long totalSize) {
        this.totalSize = totalSize;
    }

    public Paging getPaging() {
        return paging;
    }

    public void setPaging(Paging paging) {
        this.paging = paging;
    }

    @Override
    public String toString() {
        return "Response [code=" + code + ", message=" + message + ", success=" + success + ", result=" + result
                + ", pageNum=" + pageNum + ", pageSize=" + pageSize + ", totalSize=" + totalSize + ", paging=" + paging
                + "]";
    }
}
