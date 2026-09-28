# HEALTH-MVP-1.1 验证记录

日期：2026-09-28。本机 Windows、Java 21.0.11、Node 24.19.0。验证使用虚构资料和 local/H2；没有调用真实医院、患者或外部 AI 服务。

## 已完成

| 检查 | 结果 |
| --- | --- |
| 两端 `npm run build:deploy` | 通过，前端已同步到各自 Spring Boot static |
| 两端 npm 依赖审计（含开发依赖） | 0 已知漏洞告警；以本次 registry 审计结果为准 |
| `mvn -B verify` | 通过，两个可执行 JAR 构建成功 |
| HealthWorkflowTest | 18 项通过：归属/医院隔离、角色约束、版本冲突、审核流程、改派失效、SOP 快照、异常升级、复诊证据、原记录关联、幂等键、零分母、SQL 标识符白名单 |
| AdminHttpTest | 6 项通过：实际 HTTP 会话、字段校验、患者角色拒绝、平台权限、API/静态隔离、同版本并发人工联系 |
| PublicIntroductionTest | 3 项通过：无需登录访问、旧患者 API 404、管理路由不映射用户 SPA、健康检查 |
| React 静态渲染检查 | React 18 + Router 7 登录页正常渲染；用户介绍中英文均显示三种模式，未出现信息采集表单或业务链接 |
| JAR 实际启动 | admin 18080 / user 18081 同时运行、共用本机 H2；liveness/readiness 均 200，根页面与 JS/CSS 均正常返回 |
| JAR 实际业务请求 | 人工建档→任务→模板草稿→医生审核→人工联系证据→完成→沟通记录→退出，完整通过 |
| 仓库检查 | `git diff --cached --check` 通过；dev/prod 密码与 JWT 空值，未包含私钥、GitHub 凭证、本机数据库、node_modules 或 target |

并发测试通过两个独立 HTTP 请求同时提交相同 version，断言结果恰为一个 200、一个 409，并在请求提交后查询，确认只有一条沟通记录、一条人工联系审计。它不是仅通过测试事务回滚模拟的串行断言。

实际 JAR 验证还确认：用户 `/join/demo-preview` 显示介绍；用户 `/login`、`/patients/1001` 与 `/bgssai/user/*` 的原业务路径返回 404；后台未登录返回 401。人工联系步骤不对外发送消息。

前端依赖调整保留 React 18 / Ant Design 5，更新 Router 和 Vite 并移除未使用的依赖。参考 [Router 官方安全公告](https://github.com/remix-run/react-router/security/advisories/GHSA-wrjc-x8rr-h8h6)、[Router 7 DOM 兼容说明](https://api.reactrouter.com/v7/modules/react-router-dom.html)、[Vite 7 迁移说明](https://v7.vite.dev/guide/migration)。Node 版本要求已在 README 同步。

## 待验收与限制

- 本机会话没有可用受控浏览器，尚未完成真实浏览器的桌面/手机视觉、逐页点击、二维码复制及打印验收。静态渲染和 HTTP 检查不替代浏览器验收。
- 未提供本机 MySQL/Docker，规范 MySQL DDL、部署库并发锁语义和性能仍需开发环境验收；H2 通过不等于 MySQL 已验证。
- 管理端 JS 主包约 1.28 MB（gzip 406 KB），构建有体积告警；后续可按页面拆包。没有把该告警宣称为零告警构建。
- 未发布华为云。需要 PR 合并到 develop，并按部署交接补全中央 Jenkins 服务注册、同机探针地址、数据库凭据、JWT 和 TLS。
- 微信、小程序、HIS、AI 与外部周报投递未联调。用户端患者功能按最新要求延期；不得以本次后台演示宣称已接通患者服务。
