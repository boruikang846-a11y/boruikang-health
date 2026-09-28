# HEALTH 开发环境发布

部署入口为 Jenkins `bgssai/dev-health-deploy`，关停入口为 `bgssai/dev-health-stop`；均来自中央生成器，不能手工新建 Job。两端从 `develop` 构建，以 `application-dev.properties` 启动。生产环境主机尚未分配，当前入口拒绝 prod；未来 prod 同样使用 develop。

## 首次准备

1. Jenkins 中配置用户名/密码凭据 `bgssai-dev-ssh`。主机清单 Secret file `bgssai-dev-hosts` 合并中央模板的 `HEALTH_*` 条目；不要替换其他产品已有配置。GitHub 读取使用 `bgssai-github`。
2. 两端目标均为 `46.250.162.15`（私网 `192.168.0.173`）。通过 Jenkins 单独运行中央 `jenkins/install/provision-build-host.sh` 准备 Java 21、Maven、Node 20.19+、npm、git、ss；安装 Nginx 也属于首次装机步骤。部署任务本身不安装软件包。
3. 在 Jenkins 的受控执行环境检出本仓 develop，绑定开发库凭据后以 `ENVIRONMENT=dev MYSQL_HOST=101.44.189.190 MYSQL_USER=<绑定用户名> MYSQL_PWD=<绑定密码>` 运行 `bash jenkins/initialize-dev.sh`。脚本仅接受空库，依次执行本仓 `sql/DDL.sql`、`sql/DML.sql`、`sql/dev/DML.sql`，绝不 DROP。已有表时必须先核查结构和数据；1.1 升级使用 `sql/migrations/20260928-hospital-source.sql`。
4. 单独创建应用数据库用户 `bgssai_health`，仅授权 `bgssai_health.*` 所需的 SELECT/INSERT/UPDATE/DELETE，限制来源为 HEALTH 主机。数据库密码与至少 32 字节随机 JWT 密钥只放 Jenkins 凭据及服务器权限 0600 的 `/etc/bgssai/bgssai-health-{admin,user}.env`，不提交 Git。变量名以各端 properties 的 relaxed binding 为准。
5. 两端都使用 8080：管理端绑定 `127.0.0.2`、用户端绑定 `127.0.0.3`。中央主机清单的 `BIND_ADDRESS` 负责对应的端口归属检查与健康探测，不会修改应用监听配置。不要把 8080 暴露到公网。
6. 证书本地保管于 `C:\Users\lzhao3730\Desktop\github\ssl\letsencrypt_dev.user.bgssai-health.com`。同一 SAN 证书包含两个 dev 域名。通过 Jenkins 安装 `fullchain.pem` 和 `privkey.pem` 至 `/etc/nginx/ssl/bgssai-health/`（私钥 0600）；ACME 账户私钥不用上传至应用服务器。
7. 手动触发 dev-health-deploy，先用户端、后管理端。分别确认 `http://127.0.0.3:8080/bgssai/health/readiness`、`http://127.0.0.2:8080/bgssai/health/readiness` 返回 200。随后安装 `deploy/nginx/health-dev.conf` 到适合本机发行版的 Nginx include 目录，执行 `nginx -t` 成功后 reload。
8. 验证两个公网 HTTPS 域名、证书、管理端登录、角色权限及医院 Mock 同步。管理端 `manager` / `HealthDemo@2026!` 为演示账号；所有患者数据均为虚构。

## 当前证据与限制

2026-09-28：MVP PR #1 已合并 develop，两条 A 记录已解析到目标 IP，Let's Encrypt SAN 证书已签发，有效期至 2026-12-27。此文档提供发布步骤，不代表部署成功。主机 SSH 认证已通过，证书尚待安装到服务器；续期尚未自动化，需在到期前运行 SSL 文件夹内的续期脚本并重新安装证书。
