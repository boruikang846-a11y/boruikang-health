package com.boruikang.health.user;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
@SpringBootApplication(scanBasePackages = "com.boruikang.health")
@MapperScan("com.boruikang.health.mapper")
public class UserApplication {
    public static void main(String[] args) { java.util.TimeZone.setDefault(java.util.TimeZone.getTimeZone("Asia/Shanghai")); SpringApplication.run(UserApplication.class, args); }
}
