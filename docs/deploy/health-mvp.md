# HEALTH 开发环境交接

本文件是待执行部署说明。未连接或修改华为云主机、Nginx、数据库和 Jenkins；不表示环境已经上线。

## 目标拓扑

| 服务 | 域名 | 主机 | 应用监听 |
| --- | --- | --- | --- |
| HEALTH-ADMIN | dev.admin.bgssai-health.com | 46.250.162.15 / 私网 192.168.0.173 | 127.0.0.2:8080 |
| HEALTH-USER | dev.user.bgssai-health.com | 同上 | 127.0.0.3:8080 |

两端同机，以不同 loopback 地址保持骨架 8080 端口约定。Nginx 按域名代理对应地址；须在目标 Linux 主机验证 loopback 绑定、TLS 证书和反代。用户端只有公开介绍，不转发到管理端 API。

## 分支与流水线

dev/prod 统一发布 **develop**。dev 加 `--spring.profiles.active=dev`，prod 加 `--spring.profiles.active=prod`。禁止把 codex 工作分支或 Master 当作环境发布源。

1. 本产品 draft PR 人工审阅合并到 develop。
2. 中央 `bgssai-workflows` 注册 HEALTH-ADMIN / HEALTH-USER、仓库、目标主机与模块路径。
3. 中央现有健康探针默认请求 127.0.0.1:8080；HEALTH 同机方案必须分别探测 127.0.0.2:8080 和 127.0.0.3:8080。未调整前不要直接套用现有发布任务。
4. 在受控 Jenkins 工作区补齐 profile 的数据库用户/密码和每端独立 JWT 密钥。公开 GitHub 仓库中 dev/prod 密钥留空，不能把实际凭据提交回 Git。运行包及工作区须限制访问。
5. 按 sql/README.md 初始化隔离开发库，更换公开演示口令；核对继承骨架的数据库地址确实是 HEALTH 被授权使用的实例。
6. 构建前端并同步 static，根目录 Maven 构建产生两个独立 Boot JAR；common 无需部署。只通过中央 Jenkins 发布，记录 develop commit SHA 与构建号。

中央流水线和 Nginx 配置尚未修改，也未创建可直接点击执行的 HEALTH Jenkins Job；这两项需要在对应基础设施仓库按 PR 流程交付。

## 构建与检查

前端构建命令见根 README。JAR 路径分别为：

```text
bgssai-health-admin/bgssai-health-admin/target/bgssai-health-admin-0.0.1-SNAPSHOT.jar
bgssai-health-user/bgssai-health-user/target/bgssai-health-user-0.0.1-SNAPSHOT.jar
```

每端检查 `/bgssai/health/liveness`、`/bgssai/health/readiness`、根页面和静态资源。管理端未登录访问 `/bgssai/admin/dashboard` 必须 401；患者端 `/bgssai/user/login` 等旧业务接口必须 404。

dev 上复核：MySQL 建表/种子脚本、登录/退出、同院归属、任务创建→审核→人工联系→完成、重复请求冲突、改派使旧审核失效、复诊证据与周报口径。检查真实 HTTPS 下的桌面及手机页面、二维码复制和打印。外部 AI、企微、小程序、HIS 未联调时继续保持未接入状态。

## 回退

发布前保留上一构建 JAR、profile 与数据库备份，回退使用中央 Jenkins 对应版本。不要为回退删除库或重新执行种子覆盖数据。结构变更必须另有迁移和回退方案；本首版 DDL 仅用于空库初始化。
