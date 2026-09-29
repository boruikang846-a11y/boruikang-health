# BGSSAI Health

医患运营管理 MVP，遵循 `bgssai-skeleton` 的 Java 21 / Spring Boot 4 / MyBatis Example / PageHelper / React 18 / Ant Design 5 结构。

- **HEALTH-ADMIN**：我方受托运营团队使用的工作台。医院 Mock 数据导入、患者建档与分派、出院报告关联、随访草稿、院方临床审核凭证、结构化人工联系与再次联系计划、院方反馈凭证、异常升级、复诊核实、宣教内容、渠道管理、运营履约率与日报周报归档。
- **HEALTH-USER**：以 HTML/CSS 图解介绍整个系统、团队分工、出院报告随访依据，以及企业微信、微信小程序、Web 三种计划模式，支持手机布局与中英文。没有患者注册、登录、入组、咨询、指标填报或消息 API。
- 医院医生、护士是临床协作对象，MVP 不给他们分配管理端账号。运营人员登记院方联系人及实际审核、反馈凭证；这不是院方电子签名。外部渠道未接通。人工联系记录表示运营团队录入的实际服务事实，不代表系统已发送消息。AI 默认关闭，模板草稿可独立使用。

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

管理端 `http://localhost:8080`，介绍页 `http://localhost:8081`。local 自动初始化 H2，数据保存在根目录 `.local-data/`，重启保留；两个进程共用同一演示库。演示账号仅用于 local 和授权的 dev 虚构数据环境，禁止用于真实医院或 prod。

| 本地演示账号 | 权限 | 密码 |
| --- | --- | --- |
| manager | 全院运营、医院 Mock 同步、任务安排、院方凭证登记与复盘 | HealthDemo@2026! |
| operator_a / operator_b / operator_c / operator_d | 我方受托运营人员；处理分配给自己的患者与任务 | HealthDemo@2026! |
| platform | 接入设置；不能访问患者 | HealthDemo@2026! |

开发前端时启动各目录的 `npm run dev`，管理端 3001 代理后端 8080，用户端介绍页 3002。二维码的 local 链接指向 3002；若只使用 JAR 演示，可在启动管理端时增加 `--health.user-url=http://localhost:8081`。

## 验收路径

1. operator_a 登录，进入随访，关联出院报告、确认节点日期，用模板或人工起草并提交待院方审核。无需 SOP 对象。
2. 我方运营人员在线下取得责任医生实际审核后，登记审核后的文本、时间、渠道与回执；没有院方回执不能进入联系患者步骤。
3. 运营人员人工联系。未接通留下原因与下次计划；接通后核实身份、核对原报告并登记反馈，完成任务。
4. 运营人员向院方交付记录，取得反馈后登记时间、渠道与凭证；从“随访统计与复盘”查看履约率、日归档与周复盘。检查沟通与审计时间轴；重复操作或旧版本请求返回冲突。更换责任医生后，未触达的旧审核自动失效。
5. 公开访问用户端查看三模式说明；患者业务接口应返回 404。

演示数据在 `sql/dev/DML.sql`：87 位患者、182 份记录、371 个任务、17 个渠道、77 条结构化联系记录，覆盖待执行/审核/联系/完成、异常升级和复诊阶段。日期按首次初始化时间生成，重复运行不重置业务。

SOP 是运营团队制定的系统使用业务流程，正式版本尚未取得；不是系统配置、发布或培训管理功能。医生在线下审核个案建议，我方记录真实院方回执。很多随访内容以出院报告为依据，保留报告关联，模板只带入已有周期/日期；团队对照报告补充个体内容。

manager 可从侧栏“医院数据”预览并同步 Mock：2 位虚构患者、3 份报告，支持正常/空数据/不可用场景；再次同步不重复建档或任务。导入以医院患者号和报告号追溯，不凭手机号合并。真实医院、外部消息和 AI 尚未联调。

系统图解可从管理端 `/overview` 或登录页“了解整个系统与团队分工”打开。用户端保持介绍页，无患者业务接口。

## 文档与发布

- [范围与验收标准](docs/feature/health-mvp.md)、[参考资料吸收](docs/project/reference-intake.md)、[需求对照与差距报告 2026-09-29](docs/project/requirements-gap-20260929.md)
- [原型入口](docs/demo-static/web/index.html)、[技术设计](docs/architecture/health-mvp.md)、[API 契约](docs/api/health-mvp.md)
- [SQL 使用说明](sql/README.md)、[部署交接](docs/deploy/health-mvp.md)、[验证记录](docs/review/mvp-validation.md)
- [开发试点边界](docs/security/health-mvp.md)

GitHub 通过 draft PR 交付，目标 `develop`；明确获得合并授权后遵守检查合并。**dev 和 prod 均部署 develop**，分别使用 `application-dev.properties` 与 `application-prod.properties`。部署由中央 `bgssai-workflows` Jenkins 执行；HEALTH 两端通过各自 loopback 地址共用标准 8080 端口，Nginx 提供 HTTPS。部署状态以 Jenkins 记录与线上验收为准。

## 本轮托管运营修正与后续边界

[需求](docs/feature/managed-operations-1.4.md)、[API](docs/api/managed-operations-1.4.md)、[操作图解](docs/feature/managed-operations-1.4.html)。节点日期均人工确认；系统无自动诊断、用药调整或未经批准的医学阈值。患者侧、微信身份与扫码入组均未开放。筛查干预、上下转诊、完整患者全病程视图及服务包激活/履约仍待迭代，现有内容条目不代表全科室可执行知识规则。报告外发为人工交付凭证登记，没有自动发送。
