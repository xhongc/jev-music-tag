# Jev Music Tag

一个极简的 Jev 元数据决策工作台：把本地音乐元数据和评分问题发送给 Jev，返回可直接写回的字段建议。项目只保留一个 FastAPI 决策接口和一个 React 页面，适合验证决策提示词与字段映射。

## 功能

- 使用 `uv` 管理 Python 项目和依赖。
- FastAPI `POST /api/decide` 调用 TypeSafe Jev `systemone` 接口。
- 自动移除空值并排除 `album_img`，避免把无关内容发送给模型。
- 仅允许本项目中的可写元数据字段作为 `target_field`。
- 根据 Jev 的 `probabilities` 或 `score` 选择最高项，并返回 `metadata_updates`。
- React 单页胶囊式界面，支持编辑 JSON、提示词和问题配置。

## 快速开始

```bash
cd /Users/macbookair/coding/jev-music-tag
cp .env.example .env
# 编辑 .env，填入 JEV_API_KEY
uv sync
uv run uvicorn backend.main:app --reload --port 8000
```

另开终端启动前端：

```bash
cd /Users/macbookair/coding/jev-music-tag/frontend
npm install
npm run dev
```

默认前端地址为 `http://localhost:5173`，默认 API 地址为 `http://localhost:8000`。如需修改 API 地址，可设置 `VITE_API_URL`。

## 请求示例

```json
{
  "metadata": {"title": "主角", "artist": "王菲", "album": "主角"},
  "prompt": "请谨慎判断本地歌曲的风格。",
  "questions": {
    "genre": {
      "type": "score",
      "target_field": "genre",
      "instructions": "根据歌曲上下文选择风格。",
      "criteria": ["Pop", "Rock", "Soundtrack"]
    }
  }
}
```

## 配置

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `JEV_API_KEY` | 无 | 必填，服务端使用，不暴露给浏览器 |
| `JEV_BASE_URL` | `https://api.typesafe.ai` | Jev API 根地址 |
| `JEV_MODEL_NAME` | `jev-latest` | 使用的模型名 |

## 目录

```text
backend/main.py       FastAPI API 与 Jev 映射逻辑
frontend/src/main.jsx React 最小工作台
frontend/src/styles.css 胶囊式视觉样式
pyproject.toml        uv 项目定义
```

## 边界

这是一个最小化演示项目，不包含数据库、登录、批量文件扫描或直接写入音频文件。生产使用前应增加鉴权、请求日志脱敏、限流和文件标签写入层。
