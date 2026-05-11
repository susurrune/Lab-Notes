# Lab Notes — 科研实验记录系统

面向科研实验记录的 Web 应用，支持区块化工作区、数据表管理、统计分析与图表可视化，前后端分离架构。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 18 + Vite 5 + Chart.js 4 + react-beautiful-dnd |
| 后端 | FastAPI + SQLAlchemy 2.0 + Pydantic v2 + SQLite |
| 图表 | chartjs-chart-boxplot（箱线图）、scatter / multiLine / groupedBar |
| 导出 | xlsx（CSV/Excel 解析与导出） |

## 功能概览

**用户系统**
- 注册 / 登录 / 退出，localStorage 持久化
- 头像上传（Base64，2MB 限制）、显示名称编辑

**实验记录**
- 新建记录：空白 / 模板 / CSV&Excel 导入
- 模板管理：自定义模板 + 市场模板
- 记录编辑：Summary / 标签 / 备注
- 自动保存（可配置间隔）、版本历史

**工作区区块**
- Summary — 实验摘要、标签、日期
- Table — 原始数据表，行/列增删、CSV/PDF/Word 导出
- Chart — 折线图、多线图、柱状图、分组柱状图、散点图、箱线图
- Analysis — 统一 6 指标统计（样本数、均值、标准差、最小值、最大值、总和）
- Text — 富文本备注
- Checklist — 步骤清单，同步至 Summary
- Attachments — 文件附件，图片预览
- References — 参考文献链接管理
- Video — 视频链接嵌入

**图表能力**
- 6 种图表类型：line / multiLine / bar / groupedBar / scatter / boxPlot
- 多系列叠加（最多 3 条），分组/聚合切换
- 桌面端拖拽调整尺寸，移动端预设尺寸
- 自适应亮/暗主题（CSS 变量驱动）
- rAF 防抖渲染，实时跟随数据编辑

**扩展 & 设置**
- Extensions 插件体系：按需启用，动态加入工作区
- Settings：语言（中/英）、主题、字号、密度、自动保存间隔、数据导出/清理

## 本地运行

```bash
# 前端
npm install
npm run dev        # http://localhost:5173

# 后端（可选，默认使用 local 模式）
cd server
pip install -r requirements.txt
python -m app.scripts.init_db
uvicorn app.main:app --reload   # http://localhost:8000
```

生产构建：

```bash
npm run build      # 输出至 dist/
```

## 环境变量

| 变量 | 说明 | 默认值 |
|---|---|---|
| `VITE_API_BASE` | 后端 API 地址 | 空（local 模式） |
| `APP_ENV` | 后端运行环境 | `development` |
| `DATABASE_URL` | 数据库连接串 | `sqlite:///./data.db` |
| `CORS_ORIGINS` | 允许的前端域名 | — |

## 目录结构

```
├── index.html
├── package.json
├── vite.config.js
├── public/
│   ├── logo.svg
│   └── favicon.svg
├── server/
│   ├── app/
│   │   ├── api/v1/routes/   # datasets / rows / analysis / charts / auth
│   │   ├── core/            # config / errors / logging / security
│   │   ├── db/              # session / init
│   │   ├── models/          # ORM 模型
│   │   ├── schemas/         # Pydantic v2 schemas
│   │   ├── services/        # 业务逻辑
│   │   ├── utils/           # tidy adapter / response / versioning
│   │   └── scripts/         # init_db / seed_demo
│   └── tests/
└── src/
    ├── App.jsx
    ├── main.jsx
    ├── styles.css
    ├── context/
    │   └── AppState.jsx
    ├── data/
    │   ├── blocks.js        # 区块定义
    │   ├── extensions.js    # 拓展注册
    │   ├── i18n.js          # 中英文翻译
    │   ├── marketplace.js   # 模板市场
    │   ├── sampleData.js    # 示例数据
    │   ├── tables.js        # 表格工具函数
    │   └── templates.js     # 模板定义
    ├── services/
    │   ├── apiClient.js     # API 请求客户端
    │   └── recordsRepository.js  # 记录持久化
    ├── utils/
    │   ├── analysis.js      # 统计分析（含 box plot）
    │   └── avatar.js        # 头像工具
    └── components/
        ├── AppState.jsx
        ├── ErrorBoundary.jsx
        ├── StrictModeDroppable.jsx
        ├── AuthModal.jsx
        ├── AutoSaveNotice.jsx
        ├── ChartsPanel.jsx
        ├── CollaborationPanel.jsx
        ├── DataTable.jsx
        ├── ExtensionsModal.jsx
        ├── Header.jsx
        ├── HelpPanel.jsx
        ├── NewRecordModal.jsx
        ├── RecordEditModal.jsx
        ├── RecordForm.jsx
        ├── SettingsModal.jsx
        ├── SettingsPanel.jsx
        ├── Sidebar.jsx
        ├── TemplateBuilder.jsx
        ├── TemplateImport.jsx
        ├── TemplateMarketPanel.jsx
        ├── UserPanel.jsx
        ├── UserProfileModal.jsx
        ├── VersionHistoryPanel.jsx
        ├── VideoPanel.jsx
        ├── WorkspaceBlocks.jsx
        └── blocks/
            ├── AnalysisBlock.jsx
            ├── AttachmentsBlock.jsx
            ├── ChartBlock.jsx
            ├── ChecklistBlock.jsx
            ├── ReferencesBlock.jsx
            ├── SummaryBlock.jsx
            ├── TableBlock.jsx
            ├── TextBlock.jsx
            └── VideoBlock.jsx
```

## 数据模式

前端支持两种数据模式，通过 Settings → Data & Privacy 切换：

- **Local**（默认）— localStorage 存储，无需后端
- **API** — 连接 FastAPI 后端，支持持久化与协作

API 模式路由：

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/v1/datasets` | 创建数据集 |
| GET | `/api/v1/datasets` | 列表查询 |
| GET | `/api/v1/datasets/{id}` | 获取详情 |
| PUT | `/api/v1/datasets/{id}` | 更新数据集 |
| DELETE | `/api/v1/datasets/{id}` | 删除数据集 |
| POST | `/api/v1/datasets/{id}/rows:batchUpsert` | 批量写入行 |
| GET | `/api/v1/datasets/{id}/rows` | 查询行数据 |
| POST | `/api/v1/datasets/{id}/analysis/run` | 执行统计分析 |
| GET | `/api/v1/datasets/{id}/charts/recommend` | 图表推荐 |
| POST | `/api/v1/datasets/{id}/charts/prepare` | 图表数据准备 |

## localStorage Key 参考

| Key | 内容 |
|---|---|
| `lab_notes_users` | 用户列表 |
| `lab_notes_auth_session` | 当前会话 |
| `lab_notes_records_by_user` | 用户实验记录 |
| `lab_notes_templates_by_user` | 用户自定义模板 |
| `lab_notes_drafts_by_user` | 编辑草稿 |
| `lab_notes_extensions_by_user` | 已启用拓展 |
| `lab_notes_settings` | 应用设置 |

## 安全说明

当前版本为前端演示，密码明文存储在 localStorage，不具备加密与权限审计能力。接入后端后建议替换为 JWT + bcrypt 方案（后端已预置）。

## Roadmap

- 团队协作与多角色权限
- 实验视频云存储
- 统计报告自动生成
- 审计日志与分享控制
