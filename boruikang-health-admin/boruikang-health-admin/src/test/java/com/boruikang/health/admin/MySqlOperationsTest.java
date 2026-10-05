package com.boruikang.health.admin;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.boot.test.context.SpringBootTest;
/** Reuse business contracts against an isolated, fully seeded MySQL CI service. */
@EnabledIfEnvironmentVariable(named="HEALTH_MYSQL_TEST", matches="true")
@SpringBootTest(properties={
    "spring.datasource.url=jdbc:mysql://127.0.0.1:3307/boruikang_health?sslMode=REQUIRED&serverTimezone=Asia/Shanghai",
    "spring.datasource.username=root","spring.datasource.password=health-ci-only",
    "spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver",
    "spring.sql.init.mode=never","logging.level.root=WARN"
})
class MySqlOperationsTest extends FollowupOperationsTest {}
