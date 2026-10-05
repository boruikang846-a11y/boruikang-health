# boruikang-health

本仓是苏州博瑞康医疗科技有限公司（博瑞康）的资产，界面品牌写作「博瑞康 Health」。

遵守用户的 GitHub PR-only 工作流。开发在独立 worktree 的 codex/* 分支；提交、push、draft PR 分别记录。未明确授权合并不得合并。dev/prod 均部署 develop。部署走 boruikang-workflows（Jenkins 文件夹 boruikang），发布脚本与说明都在那个仓，本仓不放部署文件。

代码与目录规范以本仓现有模块结构和已有代码的写法为准。Java 21、Spring Boot 4、MyBatis Example、PageHelper、React 18、Vite、Ant Design 5；禁止 Lombok、Swagger、properties 占位符。每个接口一个 Controller，POST 参数在专属 DTO body，API snake_case，DTO 不返回 Entity。

需求 → HTML 原型 → 设计与契约 → 代码与 SQL，四层版本一致。医患业务基线见 docs/feature/health-mvp.md，当前增量以 docs/feature/wechat-channels-1.9.md 为准（1.8 文件导入见 docs/feature/screening-file-import-1.8.md、docs/feature/patient-file-import-1.8.md，1.7 随访 AI 见 docs/feature/followup-ai-1.7.md）（1.6 医生护士登录、1.5 台账与更早文档保留为基线）。本轮用户明确要求优先：HEALTH-USER 只做企业微信、小程序、Web 公开介绍，不提供患者业务功能；微信互动只是页面内的虚构演示。既往会议作为后台业务依据。

临床建议必须经患者的责任医生本人在系统里审核通过后，才能由团队人工联系或经微信发出，人工联系只保存联系证据；医生、护士都登录，运营人员不得代医生登记审核、查收或异常处置；未配置的外部服务不得显示已接通。数据库只使用虚构演示数据，禁止复制参考资料中的真实患者。审计只追加，患者只能访问本人数据。

SOP 是我们的运营团队制定的系统使用业务流程，正式版本尚未取得；不是系统配置、发布、规则引擎或培训管理功能。医生按流程协作并负责医学判断与个案建议审核。很多随访内容依据患者出院报告制定，须保留任务与原报告的关联。已启用 DeepSeek 时，工作人员点击生成才会把该任务关联病历的正文发给接口；草稿仍须责任医生审核。

患者及报告以医院接口为主要数据来源；当前仅使用虚构医院 Mock，保留来源 ID、幂等同步与真实接通状态，人工录入用于补充。

1.9 起管理端接入医院企业微信与公众号：微信好友、粉丝与患者档案只能由工作人员核实后人工绑定；消息只在工作人员点击时发出，系统保存微信接口的真实返回，不做定时、自动回复或群发；"已审核正文"由服务端取任务里责任医生审核通过的原文。真实凭证只在页面录入，不进仓库；模拟通道仅 local、test、dev 可用且必须标注，不得显示成已接通。
