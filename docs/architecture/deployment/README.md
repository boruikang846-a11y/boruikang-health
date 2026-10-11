# HEALTH 发布

发布工具不在本仓，统一放在 [boruikang-workflows](https://github.com/boruikang846-a11y/boruikang-workflows)：

- 使用说明：该仓 `README.md`；health 专属（运行时口令、数据库、Nginx、证书、目标机布局）：该仓 `docs/health.md`。
- Jenkins 文件夹 `boruikang`：`dev-health-deploy` 发版、`dev-health-stop` 关停、`dev-health-init-database` 空库初始化。仅手动触发。
- 两端都从 `develop` 构建，dev 用 `application-dev.properties` 启动；prod 尚未开通，开通后同样发 `develop`，只换 `application-prod.properties`。

本仓对发布的约定只有三条：

1. 目录保持 `boruikang-health-<端>/boruikang-health-<端>`（Maven 模块）与 `boruikang-health-<端>/boruikang-health-<端>-react`（前端，`npm run build:deploy` 把产物同步进后端 `static/`）；改目录或模块名时同步改发布仓 `products.json`。
2. dev 两端使用 `101.44.27.60:3306/boruikang`，启用 TLS；按用户要求，dev 的 `root` 账号与口令直接保存在两端 `application-dev.properties` 中。目标机 `/etc/boruikang/boruikang-health-<端>.env` 的 `SPRING_DATASOURCE_*` 优先级更高，发布前须同步这些覆盖值。JWT 密钥仍由该环境文件注入，prod 数据库配置仍独立管理。
3. SQL 只保留全量 `sql/DDL.sql`、`sql/DML.sql`、`sql/<env>/DML.sql`，不写增量迁移；表结构变了按「备份 → 清库 → init database → deploy」发版。

初次部署的历史记录见 `docs/architecture/deployment/health-mvp.md`。
