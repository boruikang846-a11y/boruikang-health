# bgssai-health

遵守用户的 GitHub PR-only 工作流。开发在独立 worktree 的 codex/* 分支；提交、push、draft PR 分别记录。未明确授权合并不得合并。dev/prod 均部署 develop。部署走 bgssai-workflows Jenkins。

代码与目录规范以工作区 bgssai-skeleton/docs/BGSSAI-Standards.md、DIRECTORY-LAYOUT.md 为准。Java 21、Spring Boot 4、MyBatis Example、PageHelper、React 18、Vite、Ant Design 5；禁止 Lombok、Swagger、properties 占位符。每个接口一个 Controller，POST 参数在专属 DTO body，API snake_case，DTO 不返回 Entity。

需求 → HTML 原型 → 设计与契约 → 代码与 SQL，四层版本一致。医患业务基线见 docs/feature/health-mvp.md。本轮用户明确要求优先：HEALTH-USER 只做企业微信、小程序、Web 公开介绍，不提供患者业务功能。既往会议作为后台业务依据。

临床建议必须经医生审核后由团队人工联系，系统只保存联系证据；未配置的外部服务不得显示已接通。数据库只使用虚构演示数据，禁止复制参考资料中的真实患者。审计只追加，患者只能访问本人数据。

服务 SOP 由我们的运营团队制定、发布并用于培训医生，医生按流程协作并负责医学判断与个案建议审核。很多随访内容依据患者出院报告制定，须保留任务与原报告的关联。

患者及报告以医院接口为主要数据来源；当前仅使用虚构医院 Mock，保留来源 ID、幂等同步与真实接通状态，人工录入用于补充。
