# HEALTH 开发环境交接

> 本文保留初次部署前的历史状态。当前发布状态请以 Jenkins `bgssai/dev-health-deploy` 记录、线上检查和本轮 PR 为准；本轮全量 SQL 包见 [1.4 契约](../api/managed-operations-1.4.md)。

应用部署仍待执行：未修改华为云主机、Nginx、数据库和 Jenkins。域名 DNS 与证书已按用户要求完成，具体状态见末节；不表示应用已经上线。

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


## 2026-09-28 DNS 与证书交接

- 两个域名的 A 记录已在华为云 DNS 添加并从公共解析器复核，均为 46.250.162.15，TTL 300。
- Let's Encrypt 已签发一张覆盖 dev.user.bgssai-health.com 与 dev.admin.bgssai-health.com 的 SAN 证书。有效期：2026-09-28 11:30:52 UTC 至 2026-12-27 11:30:51 UTC。
- 按用户要求存于本机 `C:\Users\lzhao3730\Desktop\github\ssl\letsencrypt_dev.user.bgssai-health.com`：fullchain.pem、cert.pem、privkey.pem、account-key.pem、签发信息与续期脚本。私钥不进入本仓库；SSL 仓库通过本地 exclude 忽略该目录，Windows ACL 限制当前账号。
- 通过 [ACME DNS-01](https://letsencrypt.org/docs/challenge-types/#dns-01-challenge) 校验签发，临时 TXT 已清理。当前未安装服务器证书、未配置自动续期；建议 11 月底前安排续期并部署更新。
- 后续 Nginx 两域名可共用 fullchain.pem / privkey.pem，先检查证书 SAN、密钥匹配与 nginx 配置，再 reload；应用发布仍必须走 develop + Jenkins。

## 1.9 企业微信与公众号接入

应用不需要新的进程或端口。接入真实通道前要准备：

1. Nginx：现有反代已把管理端域名的全部路径转给 HEALTH-ADMIN，回调路径 `/bgssai/open/` 不需要新增转发规则；只要确认该域名对公网可达（微信服务器要能打进来），前面没有 IP 白名单或登录拦截。回调必须走 HTTPS 的 443 端口，域名须已备案。
2. 微信后台：企业微信"客户联系 → API"里拿到 Secret，把回调地址、Token、EncodingAESKey 填到"接收事件服务器"，可信 IP 加入服务器出口 IP；公众号"基本配置"里填服务器地址、Token、EncodingAESKey，把出口 IP 加入白名单，并申请需要的模板消息。
3. 管理端：运营主管或平台管理员在"外部接入"填写凭证并保存，点"测试连接"看到"已接通"后启用；在"医护账号"登记企业微信成员账号；在"渠道管理"生成活码。
4. 配置项 `health.wechat.mock-allowed`：local、test、dev 为 true，prod 为 false。dev 的演示种子把两个通道设为模拟通道；联调真实通道时在页面改成"正式接入"并填真实凭证即可，不需要改配置文件。

真实凭证只在页面录入，不写入仓库、配置文件或 Jenkins 参数。当前没有真实通道接通。
