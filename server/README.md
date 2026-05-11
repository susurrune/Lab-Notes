# 科研数据记录后端服务

该服务提供科研数据记录系统的后端 API，覆盖数据集、列 schema、行数据、统计分析、图表推荐与图表数据准备等核心能力。
所有接口均遵循统一响应格式，并支持 datasetVersion 版本管理以便前端判断是否需要刷新。

## 目录结构

```
server/
└── app/
    ├── api/
    │   ├── v1/
    │   │   └── routes/        # v1 路由
    │   └── routes/            # 旧版路由（保留）
    ├── core/                  # 配置、日志、异常
    ├── db/                    # SQLAlchemy engine/session/init
    ├── models/                # ORM 模型
    ├── schemas/               # Pydantic v2 schemas
    ├── services/              # 业务逻辑
    ├── utils/                 # 工具函数（tidy/版本/推断等）
    ├── scripts/               # init_db / seed_demo
    └── main.py                # 应用入口
```

## 启动方式（uvicorn）

从 `server` 目录启动：

```bash
uvicorn app.main:app --reload
```

> 默认 SQLite 数据库路径：`sqlite:///./data.db`

说明：
- Windows 本地开发环境请使用 `uvicorn`（gunicorn 依赖 fcntl，不支持 Windows）
- 如果在 Windows 上出现 `ModuleNotFoundError: fcntl` 属于正常现象

## 示例 API 调用流程

以下以 `datasets + rows + analysis + charts` 为例：

1) 创建数据集
```bash
curl -X POST http://127.0.0.1:8000/api/v1/datasets \
  -H "Content-Type: application/json" \
  -d '{"name":"Demo Dataset"}'
```

2) 批量写入行数据（自动生成 `_rowId`）
```bash
curl -X POST http://127.0.0.1:8000/api/v1/datasets/{dataset_id}/rows:batchUpsert \
  -H "Content-Type: application/json" \
  -d '{"rows":[{"values_json":{"temperature":36.8,"ph":7.2}}]}'
```

3) 统计分析（基于 tidy data）
```bash
curl -X POST http://127.0.0.1:8000/api/v1/datasets/{dataset_id}/analysis/run \
  -H "Content-Type: application/json" \
  -d '{"filters":[],"groupBy":null,"metrics":["count","avg","min","max"]}'
```

4) 图表推荐
```bash
curl http://127.0.0.1:8000/api/v1/datasets/{dataset_id}/charts/recommend
```

5) 图表数据准备
```bash
curl -X POST http://127.0.0.1:8000/api/v1/datasets/{dataset_id}/charts/prepare \
  -H "Content-Type: application/json" \
  -d '{"chartConfig":{"chartType":"line","xKey":"measured_at","yKeys":["temperature"]},"filters":[]}'
```

> 返回中包含 `datasetVersion`，前端可用来判断数据是否需要刷新。

## 部署到 Render

在 Render 创建 Web Service，按以下配置填写：

- Root Directory: `server`
- Build Command: `pip install -r requirements.txt`
- Start Command: `gunicorn -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:$PORT --workers 2`

建议环境变量：
- `DATABASE_URL`（默认 `sqlite:///./data.db`）
- `CORS_ORIGINS`（逗号分隔，例如 `https://your-vercel-domain.vercel.app`）
