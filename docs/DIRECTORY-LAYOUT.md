# docs 分类与归档

参考 bgssai-blog/docs 的七类目录，按内容职责归档。根目录只放导航和本规约。

| 目录 | 内容 |
| --- | --- |
| api | 接口、页面与 API 映射、实现基线；生成的 JSON 契约放在 contracts 子目录 |
| architecture | 系统架构、工程指南、通用界面设计；deployment 保存部署说明，references 保存参考界面 |
| demo-static | 可运行的 HTML 原型、页面跳转图与页面资源 |
| feature | 需求、业务规则、功能详细设计和业务流程图 |
| project | 项目资料索引、历史开发与交付记录 |
| review | 验证、评审和检查记录 |
| security | 数据、权限与接入安全约束 |

不再新增 design、plans、deploy、reference-prototypes 或顶层 contracts 目录。功能方案归 feature；通用技术设计归 architecture；接口与机器契约归 api。历史材料保留日期和适用版本，由当前基线裁决有效范围。

原型按运行域放在 `demo-static/web/admin` 与 `demo-static/web/user`，入口分别是 `index.html`，页面跳转说明独立放在 `PAGE-FLOW.html`。页面资源归所属端的 assets，跨端链接使用相对路径。原型启动台为 `demo-static/index.html`；不创建本项目尚未实现的移动端目录。

业务页面直接呈现清单、详情、表单、状态和操作。需求解释、设计流程、版本历史和开发边界写入对应文档；业务办理必需的校验、权限、授权、来源和通道状态提示留在操作现场。虚构演示数据须持续标明。

原型打包脚本、解析器生成器与行为测试放在 `tools/prototype`。前端源文件和 npm 锁文件纳入版本控制，后端 static 中由 build:deploy 生成的 index.html 与 assets 不提交。CI 和部署先构建两个前端，再运行 Maven 验证与打包。
