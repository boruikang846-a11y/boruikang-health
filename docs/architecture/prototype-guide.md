# 原型运行与维护

[启动台](../demo-static/index.html) · [管理端](../demo-static/web/admin/index.html) · [用户端介绍](../demo-static/web/user/index.html) · [患者服务演示](../demo-static/web/user/patient-service-center.html)

原型可直接用浏览器打开，使用虚构内存记录，刷新恢复样例。需求、实现范围与版本关系见 [当前基线](../api/implementation-baseline.md)；历史开发记录见 [历史归档](../project/prototype-history.md)。

管理端提供清单、患者档案、筛查、旅程、随访、医生审核与微信专项交互。[诊后服务中心 2.4](../feature/health-service-journey-2.4-design.md) 的三中心旅程、AI 模板规划与医护质控为交互原型，正式接口的实现范围另见 2.3 工作单文档。患者服务 H5 为独立探索演示；HEALTH-USER 的正式实现仍只有公开介绍。

页面跳转统一见 [原型导航](../demo-static/PAGE-FLOW.html)，各端另有 [管理端 PAGE-FLOW](../demo-static/web/admin/PAGE-FLOW.html) 和 [用户端 PAGE-FLOW](../demo-static/web/user/PAGE-FLOW.html)。页面跳转图只记录可访问的页面和路径；业务流程、字段说明及设计理由归 feature。业务页面不放评审说明或页面设计流程入口。

[AECG 参考界面](../demo-static/web/admin/reference-aecg.html) 集中在管理端原型域中，样例与截图放在 assets；维护方法见 [参考说明](aecg-reference.md)。参考库不作为当前业务入口。

在仓库根目录打包单文件 HTML：

```powershell
python tools/prototype/build-preview.py "$env:TEMP/health-prototype.html"
python tools/prototype/build-preview.py "$env:TEMP/patient-import-prototype.html" --patient-import
python tools/prototype/build-preview.py "$env:TEMP/service-centers-prototype.html" --intervention-center
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

归档后先执行 `node tools/prototype/check-layout.cjs`。行为验证统一执行 `node --test tools/prototype/tests/*.test.cjs`，包括患者 H5。测试覆盖角色权限、导入、临床本人审核、旅程、诊后服务与筛查台账；浏览器仍需检查布局和点击路径。
