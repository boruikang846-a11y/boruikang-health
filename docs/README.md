# 博瑞康 Health 文档

[目录规约](DIRECTORY-LAYOUT.md) · [当前实现基线](api/implementation-baseline.md) · [可操作原型](demo-static/index.html)

| 分类 | 入口与内容 |
| --- | --- |
| 需求与功能设计 | [全旅程 2.0](feature/journey-2.0.md)、[诊后服务设计](feature/after-care-full-process-2.1-design.md)、[患者身份讲解](feature/patient-identity-demo.html) |
| 架构与工程说明 | [系统架构](architecture/health-mvp.md)、[原型运行与打包](architecture/prototype-guide.md)、[部署交接](architecture/deployment/README.md) |
| 接口与机器契约 | [当前 API](api/journey-2.0.md)、[页面与 API 映射](api/page-api-mapping.md)、[机器契约](api/contracts/health-2.0.json) |
| 原型 | [管理端](demo-static/web/admin/index.html)、[用户端介绍](demo-static/web/user/index.html)、[患者服务演示](demo-static/web/user/patient-service-center.html) |
| 项目资料与历史 | [参考资料吸收](project/reference-intake.md)、[原型历史记录](project/prototype-history.md) |
| 检查与验收记录 | [MVP 验证](review/mvp-validation.md)、[原型同步验证](review/prototype-sync-2.0.md) |
| 安全 | [开发试点边界](security/health-mvp.md) |

正式实现以当前基线和代码为准。版本快照、探索稿、虚构原型与真实验收分别标明；文件存在不表示能力已上线。dev 与 prod 都部署 `develop`，仅使用不同的 properties 配置。
