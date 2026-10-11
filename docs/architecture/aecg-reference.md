# AECG 医生工作站参考界面 · HTML 预览

打开 **[参考界面入口](../demo-static/web/admin/reference-aecg.html)**，进入页面引导页，无需安装依赖或启动服务。可运行文件统一归原型目录，本文件仅记录参考来源和维护方法。

这是根据本地 AECG CDTX 参考截图还原的独立界面原型，用于浏览参考系统的信息结构。它保留参考系统的界面名称，与博瑞康 Health 产品原型分开存放；不代表本系统已实现或接通参考系统。

- 52 个页面入口，覆盖筛查干预、随访管理、精细化管理和系统菜单；加上引导页共 53 个 HTML 文件。
- 引导页支持按模块筛选和页面搜索，页面内可点击菜单、页签及详情弹窗。
- 表格支持本地文字筛选、分页，表单支持基础校验，导出按钮下载虚构演示 CSV。
- 底部「查看截图」可查看、放大和翻阅预览截图。
- 纯静态 HTML/CSS/JavaScript，使用相对路径；保留入口及对应 assets 目录即可离线浏览。

## 数据与截图

HTML 中的姓名、证件号、联系方式、组织和检查内容均为虚构演示信息。统计图保留参考截图的汇总数字，仅用于界面演示。

**公开仓库中的 52 张 PNG 由这些虚构数据 HTML 页面重新渲染生成。原始参考截图含个人信息，仅保存在本地，不纳入此仓库。** 参考库不含原始采集清单、患者个人资料或业务系统凭证。

原型还原布局和基础交互，不连接业务接口。未提供截图的业务操作显示本地演示提示。浏览器字体和缩放比例可能造成与参考布局的差异。

## 文件结构与维护

- `docs/demo-static/web/admin/reference-aecg.html`：页面引导。
- `docs/demo-static/web/admin/assets/aecg-reference/`：catalog.json 索引源数据、catalog.js 浏览器索引、preview.css 和 preview.js。
- `docs/demo-static/web/admin/assets/aecg-reference/cdtx/`：52 个页面样例与对应虚构数据预览 PNG。
- `tools/prototype/build-aecg-preview.py`：页面和浏览器索引生成器。

在仓库根目录运行 `python tools/prototype/build-aecg-preview.py` 重新生成 52 个页面样例和浏览器索引，运行 `node tools/prototype/check-layout.cjs` 检查目录、资源与链接。生成器的 `--render-screenshots` 模式需要另备 Python Playwright 与 Chromium；本次归档保留已有虚构截图，不重新采集。添加参考页面时同步 catalog.json 与 preview.js。
