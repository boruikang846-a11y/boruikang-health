# BGSSAI Health

医患运营管理 MVP，遵循 `bgssai-skeleton` 的 Java 21 / Spring Boot 4 / MyBatis Example / PageHelper / React 18 / Ant Design 5 结构。

- **HEALTH-ADMIN**：患者建档与分派、原始记录、随访草稿与医生审核、人工联系证据、异常升级、复诊跟踪、知识 SOP、渠道管理、周报与接入设置。
- **HEALTH-USER**：仅公开介绍企业微信、微信小程序、Web 三种计划模式，支持手机布局与中英文。没有患者注册、登录、入组、咨询、指标填报或消息 API。
- 外部渠道未接通。人工联系记录表示医护录入的实际服务事实，不代表系统已向患者发送消息。AI 默认关闭，模板草稿可独立使用。

## 本地运行

需要 JDK 21、Maven 3.9+、Node.js 22.12+（或 24 LTS）与 npm。从仓库根目录执行：

```powershell
npm --prefix bgssai-health-admin/bgssai-health-admin-react ci
npm --prefix bgssai-health-user/bgssai-health-user-react ci
npm --prefix bgssai-health-admin/bgssai-health-admin-react run build:deploy
npm --prefix bgssai-health-user/bgssai-health-user-react run build:deploy
mvn -B verify
```

在两个终端中分别启动，工作目录均为仓库根目录：

```powershell
java -jar bgssai-health-admin/bgssai-health-admin/target/bgssai-health-admin-0.0.1-SNAPSHOT.jar --spring.profiles.active=local --server.port=8080
```

```powershell
java -jar bgssai-health-user/bgssai-health-user/target/bgssai-health-user-0.0.1-SNAPSHOT.jar --spring.profiles.active=local --server.port=8081
```

管理端 `http://localhost:8080`，介绍页 `http://localhost:8081`。local 自动初始化 H2，数据保存在根目录 `.local-data/`，重启保留；两个进程共用同一演示库。local/test 凭据只适用于本机虚构数据，不能用于公网部署。

| 本地演示账号 | 权限 | 密码 |
| --- | --- | --- |
| manager | 本院运营主管；不能批准建议 | HealthDemo@2026! |
| doctor | 责任医生；患者一、三 | HealthDemo@2026! |
| doctor_b | 第二医生；患者二 | HealthDemo@2026! |
| nurse | 健康管家；分配给自己的患者 | HealthDemo@2026! |
| platform | 接入设置；不能访问患者 | HealthDemo@2026! |

开发前端时启动各目录的 `npm run dev`，管理端 3001 代理后端 8080，用户端介绍页 3002。二维码的 local 链接指向 3002；若只使用 JAR 演示，可在启动管理端时增加 `--health.user-url=http://localhost:8081`。

## 验收路径

1. nurse 登录，进入随访，领取演示任务，选择已发布 SOP 起草并提交审核。
2. doctor 在另一浏览器或窗口登录，核对原记录、修改建议并通过审核。
3. nurse 刷新任务，记录实际人工联系的时间、方式和核验结果，再填写处理结果完成任务。
4. 检查沟通与审计时间轴；重复操作或旧版本请求返回冲突。更换责任医生后，未触达的旧审核自动失效。
5. 公开访问用户端查看三模式说明；患者业务接口应返回 404。

演示患者、记录及知识均为虚构或演示模板。没有真实医院临床 SOP 审批、外部消息、HIS 或 AI 接通验收。

## 文档与发布

- [范围与验收标准](docs/feature/health-mvp.md)、[参考资料吸收](docs/project/reference-intake.md)
- [原型入口](docs/demo-static/web/index.html)、[技术设计](docs/architecture/health-mvp.md)、[API 契约](docs/api/health-mvp.md)
- [SQL 使用说明](sql/README.md)、[部署交接](docs/deploy/health-mvp.md)、[验证记录](docs/review/mvp-validation.md)
- [开发试点边界](docs/security/health-mvp.md)

GitHub 仅通过 draft PR 交付，目标 `develop`，等待人工合并。**dev 和 prod 均部署 develop**，分别使用 `application-dev.properties` 与 `application-prod.properties`。部署由中央 `bgssai-workflows` Jenkins 执行；本 PR 不会部署云环境。当前仍需在中央流水线注册 HEALTH 两端、调整同机探针地址并填入受控凭据。
