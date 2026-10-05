package com.boruikang.health.admin;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
@SpringBootApplication(scanBasePackages = "com.boruikang.health")
@MapperScan("com.boruikang.health.mapper")
public class AdminApplication {
    public static void main(String[] args) { java.util.TimeZone.setDefault(java.util.TimeZone.getTimeZone("Asia/Shanghai")); SpringApplication.run(AdminApplication.class, args); }
}
