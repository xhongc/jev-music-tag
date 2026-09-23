"""Small API that sends music metadata to Jev and maps score answers to tags."""
from __future__ import annotations

import json
import os
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

ALLOWED_SCORE_FIELDS = {
    "title", "subtitle", "artist", "album", "albumartist", "album_type",
    "genre", "year", "comment", "description", "composer", "lyricist",
    "language", "date", "albumversion", "label",
}


class Question(BaseModel):
    type: str = "score"
    instructions: str = ""
    criteria: list[str] = Field(min_length=1)
    target_field: str | None = None


class DecisionRequest(BaseModel):
    metadata: dict[str, Any]
    prompt: str = ""
    questions: dict[str, Question]


app = FastAPI(title="Jev Music Tag", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


def compact(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            key: compact(item)
            for key, item in value.items()
            if key != "album_img" and item not in (None, "", [], {})
        }
    if isinstance(value, list):
        return [compact(item) for item in value if item not in (None, "", [], {})]
    return value


def validate_questions(questions: dict[str, Question]) -> None:
    if not questions:
        raise HTTPException(422, "至少配置一个 Jev score 问题")
    for name, question in questions.items():
        if question.type != "score":
            raise HTTPException(422, f"问题 {name} 目前仅支持 score 类型")
        target = question.target_field or name
        if target not in ALLOWED_SCORE_FIELDS:
            raise HTTPException(422, f"{target} 不是允许写入的元数据字段")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "jev-music-tag"}


@app.post("/api/decide")
async def decide(request: DecisionRequest) -> dict[str, Any]:
    validate_questions(request.questions)
    api_key = os.getenv("JEV_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(400, "请先设置 JEV_API_KEY 环境变量")

    document = "本地音乐元数据：\n" + json.dumps(compact(request.metadata), ensure_ascii=False, default=str)
    if request.prompt.strip():
        document += "\n\n" + request.prompt.strip()
    wire_questions = {
        name: {"type": q.type, "instructions": q.instructions, "criteria": q.criteria}
        for name, q in request.questions.items()
    }
    payload = {
        "model": os.getenv("JEV_MODEL_NAME", "jev-latest").strip(),
        "state": {"document": document},
        "questions": wire_questions,
    }
    base_url = os.getenv("JEV_BASE_URL", "https://api.typesafe.ai").rstrip("/")
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(60, connect=10), follow_redirects=False) as client:
            response = await client.post(
                f"{base_url}/v1/systemone",
                headers={"Authorization": f"Bearer {api_key}", "Accept": "application/json"},
                json=payload,
            )
    except httpx.HTTPError as exc:
        raise HTTPException(502, "Jev 请求失败，请检查服务地址或网络连接") from exc
    if response.status_code != 200:
        raise HTTPException(response.status_code, f"Jev 请求失败（HTTP {response.status_code}）")
    try:
        result = response.json()
    except ValueError as exc:
        raise HTTPException(502, "Jev 返回了无效 JSON") from exc
    answers = result.get("answers") if isinstance(result, dict) else None
    if not isinstance(answers, dict):
        raise HTTPException(502, "Jev 返回的决策结果缺失")

    updates: dict[str, str] = {}
    for name, question in request.questions.items():
        answer = answers.get(name)
        if not isinstance(answer, dict) or answer.get("type") != "score":
            raise HTTPException(502, f"问题 {name} 的返回类型不匹配")
        probabilities = answer.get("probabilities") or {}
        selected = max(probabilities.items(), key=lambda item: item[1])[0] if probabilities else None
        try:
            index = int(selected) if selected is not None else int(round(float(answer.get("score", 0))))
        except (TypeError, ValueError) as exc:
            raise HTTPException(502, f"问题 {name} 的评分无效") from exc
        index = max(0, min(index, len(question.criteria) - 1))
        updates[question.target_field or name] = question.criteria[index]
    return {"answers": answers, "metadata_updates": updates, "document": document}
