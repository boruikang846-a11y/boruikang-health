# docs 分类与归档

参考 bgssai-blog/docs/DIRECTORY-LAYOUT.md，按内容职责归档。本文件是本仓 docs 目录组织的唯一规约；根目录只放导航和本规约。

| 目录 | 内容 |
| --- | --- |
| api | 接口、页面与 API 映射、实现基线；生成的 JSON 契约放在 contracts 子目录 |
| architecture | 系统架构、工程指南、通用界面设计及参考界面说明；deployment 保存部署说明 |
| demo-static | 可运行的 HTML 原型、启动台、页面跳转图与运行资源，包括明确标注的参考界面 |
| feature | 需求、业务规则、功能详细设计和业务流程图解 |
| project | 项目资料索引、历史开发与交付记录 |
| review | 验证、评审和检查记录 |
| security | 数据、权限与接入安全约束 |

不再新增 design、plans、deploy、reference-prototypes 或顶层 contracts 目录。功能方案归 feature；通用技术设计归 architecture；接口与机器契约归 api。历史材料保留日期和适用版本，由当前基线裁决有效范围。

只有 demo-static 按端与运行域拆分，其余六类文档两端合放，不设 admin / user 子目录。前端和后端模块仅放运行说明与协作约定，业务文档统一归根目录 docs。

## 原型归档

当前原型按运行域放在 `demo-static/web/admin` 与 `demo-static/web/user`。两端分别以 `index.html` 作为启动台，以 `PAGE-FLOW.html` 记录页面跳转。根原型目录也保留这两个入口；web 根层不平铺页面或资源。本项目尚无独立移动客户端原型，不预建空的 Android / iOS 目录。

页面专用资源归所属端的 assets。AECG 参考入口为 `web/admin/reference-aecg.html`，其页面样例、截图、索引和脚本集中在 `web/admin/assets/aecg-reference`。参考库是独立虚构演示，不参与业务工作台运行；参考说明归 architecture。

demo-static 仅放运行页面、页面跳转 HTML 和运行资源，不放 Markdown、生成脚本或测试。功能解释和业务流程图解归 feature，HTML 文件用 `-flow.html` 或 `-diagram.html` 命名；技术设计图归 architecture。可运行界面使用稳定的页面名称，版本号保留在对应需求和设计文档中。

跨运行域链接使用相对路径：管理端到用户端用 `../user/`，用户端到管理端用 `../admin/`。页面内链接不得跳出本仓库；面向其他仓库的说明使用 GitHub 链接。

业务页面直接呈现清单、详情、表单、状态和操作。需求解释、设计流程、版本历史和开发边界写入对应文档；业务办理必需的校验、权限、授权、来源和通道状态提示留在操作现场。虚构演示数据须持续标明。

原型打包脚本、解析器生成器与行为测试放在 `tools/prototype`。`node tools/prototype/check-layout.cjs` 检查目录、说明图命名、页面资源和本地链接，并在 CI 执行。归档时使用 git mv，同步导航、内嵌页面、生成器和文档引用，避免保留第二份界面源码。

前端源文件和 npm 锁文件纳入版本控制，后端 static 中由 build:deploy 生成的 index.html 与 assets 不提交。CI 和部署先构建两个前端，再运行 Maven 验证与打包。
