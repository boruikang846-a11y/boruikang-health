package com.bgssai.health.common.page;

import java.io.Serializable;

public class Paging implements Serializable {

    private static final long serialVersionUID = -6200224841991052240L;

    private String previous;

    private Cursors cursors;

    private String next;

    public Cursors getCursors() {
        return this.cursors;
    }

    public void setCursors(Cursors cursors) {
        this.cursors = cursors;
    }

    public String getNext() {
        return next;
    }

    public void setNext(String next) {
        this.next = next;
    }

    public String getPrevious() {
        return previous;
    }

    public void setPrevious(String previous) {
        this.previous = previous;
    }

    @Override
    public String toString() {
        return "Paging [previous=" + previous + ", cursors=" + cursors + ", next=" + next + "]";
    }
}
