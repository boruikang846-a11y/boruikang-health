package com.boruikang.health.common.page;

public class Cursors {

    private String before;
    private String after;

    public String getBefore() {
        return this.before;
    }

    public void setBefore(String before) {
        this.before = before;
    }

    public String getAfter() {
        return this.after;
    }

    public void setAfter(String after) {
        this.after = after;
    }

    @Override
    public String toString() {
        return "Cursors [before=" + before + ", after=" + after + "]";
    }
}
