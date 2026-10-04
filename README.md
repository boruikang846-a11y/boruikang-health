# 博瑞康 Health

苏州博瑞康医疗科技有限公司的医患运营管理系统。本仓是该公司的资产。

医患运营管理 MVP，采用 Java 21 / Spring Boot 4 / MyBatis Example / PageHelper / React 18 / Ant Design 5。

- **HEALTH-ADMIN**：运营团队、院方医生和护士共用的工作台，按角色显示不同菜单。医生：查看报告（确认已阅、写意见）、审核随访意见、查收随访结果、处置升级异常、审核发布宣教。运营人员和护士：患者建档、出院报告关联、随访起草与提交审核、结构化人工联系与再次联系计划、异常响应与升级、复诊核实、邀约预约与服务包台账。运营主管另管医护账号、医院 Mock 数据导入、渠道与配置、运营履约率与日报周报归档。1.9 起可通过医院企业微信和公众号与患者沟通：好友和粉丝对应到患者档案，工作人员点击发送文字、模板消息或医生已审核的随访正文，患者来信进入待处理。
- **HEALTH-USER**：以 HTML/CSS 图解介绍整个系统、团队分工、出院报告随访依据，以及企业微信、微信小程序、Web 三种模式，并用虚构对话分步演示企业微信和公众号怎样与患者互动；支持手机布局与中英文。没有患者注册、登录、入组、咨询、指标填报或消息 API。
- 2026-09-30 起（1.6）医生、护士都登录：随访意见必须由患者的责任医生本人在系统里审核通过后才能联系患者，运营人员不能代登记审核、查收或处置。真实的企业微信、公众号通道尚未接通，待医院提供接入参数；local 和 dev 的演示数据走标明的模拟通道。人工联系记录表示团队录入的实际服务事实；微信发送记录保存的是微信接口的真实返回，受理成功不代表患者已读。AI 默认关闭，模板草稿可独立使用。

## 本地运行

需要 JDK 21、Maven 3.9+、Node.js 22.12+（或 24 LTS）与 npm。从仓库根目录执行：

```powershell
npm --prefix boruikang-health-admin/boruikang-health-admin-react ci
npm --prefix boruikang-health-user/boruikang-health-user-react ci
npm --prefix boruikang-health-admin/boruikang-health-admin-react run build:deploy
npm --prefix boruikang-health-user/boruikang-health-user-react run build:deploy
mvn -B verify
```

在两个终端中分别启动，工作目录均为仓库根目录：

```powershell
java -jar boruikang-health-admin/boruikang-health-admin/target/boruikang-health-admin-0.0.1-SNAPSHOT.jar --spring.profiles.active=local --server.port=8080
```

```powershell
java -jar boruikang-health-user/boruikang-health-user/target/boruikang-health-user-0.0.1-SNAPSHOT.jar --spring.profiles.active=local --server.port=8081
```

管理端 `http://localhost:8080`，介绍页 `http://localhost:8081`。local 自动初始化 H2，数据保存在根目录 `.local-data/`，重启保留；两个进程共用同一演示库。演示账号仅用于 local 和授权的 dev 虚构数据环境，禁止用于真实医院或 prod。

| 本地演示账号 | 权限 | 密码 |
| --- | --- | --- |
| manager | 运营主管：全院运营、医护账号、医院 Mock 同步、任务安排与复盘 | HealthDemo@2026! |
| doctor / doctor_b / doctor_c / doctor_d | 院方责任医生：只看自己负责的患者；看报告、审核随访意见、查收结果、处置异常、审核宣教 | HealthDemo@2026! |
| nurse / nurse_b | 院方护士：处理分配给自己的患者（与运营人员同一套随访页面） | HealthDemo@2026! |
| operator_a / operator_b / operator_c / operator_d | 我方运营人员；处理分配给自己的患者与任务 | HealthDemo@2026! |
| platform | 接入设置；不能访问患者 | HealthDemo@2026! |

开发前端时启动各目录的 `npm run dev`，管理端 3001 代理后端 8080，用户端介绍页 3002。二维码的 local 链接指向 3002；若只使用 JAR 演示，可在启动管理端时增加 `--health.user-url=http://localhost:8081`。

## 验收路径

1. doctor 登录进入医生工作台，打开“患者报告”确认一份待阅报告并写意见。
2. operator_a（或 nurse）登录，进入随访，关联出院报告、确认节点日期，看到医生意见后用模板或人工起草，点“提交医生审核”。
3. doctor 在“随访意见审核”打开该任务，对照原报告修改正文后“审核通过”，或写原因“退回修改”。运营人员和护士调用审核一律被拒绝。
4. operator_a 按通过的正文人工联系。未接通留下原因与下次计划；接通后核实身份、核对原报告并登记反馈，完成任务。
5. doctor 在“随访结果查收”查看记录、写反馈并查收；升级的异常在“异常处置”记录去向与结果。检查沟通与审计时间轴；重复操作或旧版本请求返回冲突。更换责任医生后，未触达的旧审核自动失效。
6. manager 在“医护账号”新增医生或护士账号，新账号能登录；停用后立即退出、不能再登录。
7. operator_a 进入"微信沟通"，在"待绑定"里把一位联系人绑定到自己的患者，发一条文字；在已审核的随访任务里点"微信发送已审核正文"。manager 在"运营设置 → 外部接入"查看企业微信、公众号的通道状态。
8. 公开访问用户端查看三模式说明和"微信互动"演示；患者业务接口应返回 404。

演示数据在 `sql/dev/DML.sql`：87 位患者、182 份记录、371 个任务、17 个渠道、77 条结构化联系记录，覆盖待执行/审核/联系/完成、异常升级和复诊阶段。日期按首次初始化时间生成，重复运行不重置业务。

SOP 是运营团队制定的系统使用业务流程，正式版本尚未取得；不是系统配置、发布或培训管理功能。个案随访意见由责任医生在系统里审核。很多随访内容以出院报告为依据，保留报告关联，模板只带入已有周期/日期；团队对照报告补充个体内容。

manager 可从侧栏“医院数据”预览并同步 Mock：2 位虚构患者、3 份报告，支持正常/空数据/不可用场景；再次同步不重复建档或任务。导入以医院患者号和报告号追溯，不凭手机号合并。真实医院、真实微信通道和 AI 尚未联调。

系统图解可从管理端 `/overview` 或登录页“了解整个系统与团队分工”打开。用户端保持介绍页，无患者业务接口。

## 文档与发布

- [范围与验收标准](docs/feature/health-mvp.md)、[参考资料吸收](docs/project/reference-intake.md)
- [原型入口](docs/demo-static/web/index.html)、[技术设计](docs/architecture/health-mvp.md)、[API 契约](docs/api/health-mvp.md)
- [SQL 使用说明](sql/README.md)、[部署交接](docs/deploy/health-mvp.md)、[验证记录](docs/review/mvp-validation.md)
- [开发试点边界](docs/security/health-mvp.md)

GitHub 通过 draft PR 交付，目标 `develop`；明确获得合并授权后遵守检查合并。**dev 和 prod 均部署 develop**，分别使用 `application-dev.properties` 与 `application-prod.properties`。部署由 [boruikang-workflows](https://github.com/boruikang846-a11y/boruikang-workflows) 的 Jenkins 流水线执行（文件夹 `boruikang`：`dev-health-deploy` / `dev-health-stop` / `dev-health-init-database`）；HEALTH 两端通过各自 loopback 地址共用标准 8080 端口，Nginx 提供 HTTPS。部署状态以 Jenkins 记录与线上验收为准。

## 1.9 企业微信与公众号

[需求](docs/feature/wechat-channels-1.9.md)、[API](docs/api/wechat-channels-1.9.md)、[流程图解](docs/feature/wechat-channels-1.9.html)、[交互原型](docs/demo-static/web/admin/wechat-channels-1.9.html)、[验证记录](docs/review/wechat-channels-1.9.md)。接入配置与真实连接测试、签名校验的公开回调、微信联系人与患者档案的人工绑定、文字 / 公众号模板消息 / 医生已审核正文三类发送、患者来信待处理与转咨询、渠道活码、欢迎语。临床内容仍须责任医生审核；企业微信未开通会话存档，系统看不到成员的聊天正文。没有真实凭证时用模拟通道演示，页面全程标注，不代表已接通。

## 1.6 医生、护士登录

[需求](docs/feature/clinical-login-1.6.md)、[API](docs/api/clinical-login-1.6.md)、[流程图解](docs/feature/clinical-login-1.6.html)、[交互原型](docs/demo-static/web/admin/clinical-login-1.6.html)。1.4 起“院方医生护士不登录、运营登记院方凭证”的做法取消：医生看报告、审核随访意见、查收结果、处置异常、审核宣教都在系统里本人完成；护士与运营人员同一套随访执行页面。院方联系人表删除，责任医生、转介医生、接诊医生都指向医生账号。发版仍为全量口径。

## 本轮托管运营修正与后续边界

[需求](docs/feature/managed-operations-1.4.md)、[API](docs/api/managed-operations-1.4.md)、[操作图解](docs/feature/managed-operations-1.4.html)。1.5 运营台账（患者池、邀约、预约到诊、服务包与方案、转诊、模板与短信登记、十项指标、工作台队列）见 [需求](docs/feature/operations-ledger-1.5.md)、[API](docs/api/operations-ledger-1.5.md)、[流程图解](docs/feature/operations-ledger-1.5.html)、[交互原型](docs/demo-static/web/admin/operations-ledger-1.5.html)。发版为全量口径：备份后清库，按 sql/DDL.sql → DML.sql → dev/DML.sql 重建。节点日期均人工确认；系统无自动诊断、用药调整或未经批准的医学阈值。患者侧业务与扫码自助入组未开放；微信身份只由工作人员核实后绑定（1.9）。筛查干预、上下转诊、完整患者全病程视图及服务包激活/履约仍待迭代，现有内容条目不代表全科室可执行知识规则。报告外发为人工交付凭证登记，没有自动发送。
