# 原型运行与维护

[启动台](../demo-static/index.html) · [管理端](../demo-static/web/admin/index.html) · [用户端介绍](../demo-static/web/user/index.html) · [患者服务演示](../demo-static/web/user/patient-service-center.html)

原型可直接用浏览器打开，使用虚构内存记录，刷新恢复样例。需求、实现范围与版本关系见 [当前基线](../api/implementation-baseline.md)；历史开发记录见 [历史归档](../project/prototype-history.md)。

管理端提供清单、患者档案、筛查、旅程、随访、医生审核与微信专项交互。患者服务 H5 为独立探索演示；HEALTH-USER 的正式实现仍只有公开介绍。

页面跳转说明分别见 [管理端 PAGE-FLOW](../demo-static/web/admin/PAGE-FLOW.html) 和 [用户端 PAGE-FLOW](../demo-static/web/user/PAGE-FLOW.html)。业务页面不再放评审说明或页面设计流程入口。

在仓库根目录打包单文件 HTML：

```powershell
python tools/prototype/build-preview.py "$env:TEMP/health-prototype.html"
python tools/prototype/build-preview.py "$env:TEMP/patient-import-prototype.html" --patient-import
```

修改正式导入规则后，先安装管理端依赖，再重新生成离线解析器：

```powershell
npm --prefix boruikang-health-admin/boruikang-health-admin-react ci
node tools/prototype/build-import-parser.mjs
```

Java、React 或 SQL 发生相关变更时，更新并检查生成契约：

```powershell
node tools/sync-implementation-contract.cjs --write
node tools/sync-implementation-contract.cjs
```

行为验证在 `tools/prototype/tests`。至少执行 CI 中的六项测试；患者 H5 单独执行 `patient-service-center.test.cjs`。测试覆盖角色权限、导入、临床本人审核、旅程、诊后服务与筛查台账；浏览器仍需检查布局和点击路径。
