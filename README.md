# Lab Notes 科研实验记录系统

Lab Notes 是面向科研实验记录的 Web 应用，强调简洁的工作区、插件式拓展与可配置的设置中心。项目为前端 MVP，可在无后端的情况下演示完整流程。

## 核心体验
- Workspace Blocks：实验记录以区块方式组织，支持拖拽排序与自定义添加
- Extensions 插件体系：功能按需启用，启用后才加入工作区
- Settings 中心：通用/外观/工作区/提示与帮助/数据与隐私
- 账号与头像：注册、登录、头像上传（本地 Base64）

## 功能概览
- 注册 / 登录 / 退出（localStorage 持久化）
- 头像 + 显示名称 + 用户菜单（Profile / Settings / Logout）
- 实验工作区区块：添加、重命名、拖拽排序
- 数据表区块：CSV/PDF/Word 导出
- 图表区块：line / bar / scatter，桌面端拖拽调整尺寸，移动端预设尺寸
- 插件拓展：数据可视化、基础统计、附件、视频、步骤清单、参考资料
- 设置中心：多分组配置 + 数据导出 / 清理

## 本地运行
```bash
cd web
npm install
npm run dev
```

生产构建：
```bash
npm run build
```

## 交互说明
- 启用拓展：右上角 Extensions -> Add to Workspace
- 添加区块：工作区底部 “Add Block”
- 拖拽排序：区块右侧拖拽手柄
- 调整图表大小：桌面端拖拽边框；移动端使用 Small/Medium/Large
- 打开设置：用户菜单 -> Settings

## 目录结构
```
web/
├── index.html
├── public/
│   ├── logo.svg
│   └── favicon.svg
├── package.json
├── vite.config.js
└── src/
    ├── App.jsx
    ├── main.jsx
    ├── styles.css
    ├── utils/
    │   └── analysis.js
    ├── data/
    │   ├── blocks.js
    │   ├── extensions.js
    │   ├── templates.js
    │   ├── marketplace.js
    │   ├── sampleData.js
    │   └── i18n.js
    └── components/
        ├── AuthModal.jsx
        ├── Header.jsx
        ├── Sidebar.jsx
        ├── WorkspaceBlocks.jsx
        ├── ExtensionsModal.jsx
        ├── SettingsModal.jsx
        ├── NewRecordModal.jsx
        ├── AutoSaveNotice.jsx
        ├── RecordEditModal.jsx
        ├── UserProfileModal.jsx
        └── blocks/
            ├── SummaryBlock.jsx
            ├── TableBlock.jsx
            ├── TextBlock.jsx
            ├── ChecklistBlock.jsx
            ├── ChartBlock.jsx
            ├── AnalysisBlock.jsx
            ├── AttachmentsBlock.jsx
            ├── ReferencesBlock.jsx
            └── VideoBlock.jsx
```

## 本地数据存储（localStorage）
> 仅用于本地演示与开发，不是生产级安全方案。

Key 列表：
- `lab_notes_users`
- `lab_notes_auth_session`
- `lab_notes_records_by_user`
- `lab_notes_templates_by_user`
- `lab_notes_drafts_by_user`
- `lab_notes_extensions_by_user`
- `lab_notes_settings`

示例结构：
```json
{
  "lab_notes_users": [
    {
      "id": "uuid",
      "displayName": "Lin",
      "email": "lin@example.com",
      "password": "plain-text-demo",
      "avatar": "data:image/png;base64,..."
    }
  ],
  "lab_notes_auth_session": {
    "userId": "uuid"
  },
  "lab_notes_records_by_user": {
    "uuid": [
      {
        "id": "record-id",
        "name": "Experiment A",
        "blocks": [
          { "id": "block-1", "type": "summary", "title": "Experiment Summary" },
          { "id": "block-2", "type": "table", "title": "Data Table" }
        ]
      }
    ]
  },
  "lab_notes_extensions_by_user": {
    "uuid": ["dataViz", "analysis"]
  },
  "lab_notes_settings": {
    "language": "zh",
    "autoSave": true,
    "autoSaveInterval": 10000,
    "theme": "light",
    "fontSize": "medium",
    "density": "comfortable",
    "defaultCollapsed": false
  }
}
```

## 安全与隐私说明
- 当前版本为前端演示，账号与密码仅保存在 localStorage 中。
- 不具备加密、权限审计、数据脱敏等生产安全能力。
- 建议在接入后端后替换为安全的身份认证与存储方案。

## Roadmap
- 接入后端服务（鉴权、数据库、API）
- 团队协作与多角色权限体系
- 实验视频云存储与转码
- 多级权限、审计日志与分享控制
- 统计分析与报告自动生成

## FAQ
**如何重置数据？**
- 打开浏览器开发者工具，清空 `localStorage` 或删除相关 key。

**如何恢复默认布局？**
- 进入 Settings -> Data & Privacy，清空本地数据后重启应用。
