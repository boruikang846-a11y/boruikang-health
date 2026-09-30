# HEALTH 发布

发布工具不在本仓，统一放在 [boruikang-workflows](https://github.com/boruikang846-a11y/boruikang-workflows)：

- 使用说明：该仓 `README.md`；health 专属（运行时口令、数据库、Nginx、证书、目标机布局）：该仓 `docs/health.md`。
- Jenkins 文件夹 `boruikang`：`dev-health-deploy` 发版、`dev-health-stop` 关停、`dev-health-init-database` 空库初始化。仅手动触发。
- 两端都从 `develop` 构建，dev 用 `application-dev.properties` 启动；prod 尚未开通，开通后同样发 `develop`，只换 `application-prod.properties`。

本仓对发布的约定只有三条：

1. 目录保持 `bgssai-health-<端>/bgssai-health-<端>`（Maven 模块）与 `bgssai-health-<端>/bgssai-health-<端>-react`（前端，`npm run build:deploy` 把产物同步进后端 `static/`）；改目录或模块名时同步改发布仓 `products.json`。
2. 数据库口令、JWT 密钥不进 Git：properties 里留空，由目标机 `/etc/boruikang/boruikang-health-<端>.env` 注入。
3. SQL 只保留全量 `sql/DDL.sql`、`sql/DML.sql`、`sql/<env>/DML.sql`，不写增量迁移；表结构变了按「备份 → 清库 → init database → deploy」发版。

2026-09-30 之前本应用由 bgssai-workflows 的 `bgssai/dev-health-deploy` 发布，初次部署的历史记录见 `docs/deploy/health-mvp.md`。
