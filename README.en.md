# Jev Music Tag

A minimal Jev-powered metadata decision workbench. It sends local music metadata and score questions to Jev, then returns fields that can be written back to a track. The project intentionally contains only one FastAPI decision endpoint and one React page, making it useful for testing prompts and field mapping.

## Features

- Python dependencies managed with `uv`.
- FastAPI `POST /api/decide` calls the TypeSafe Jev `systemone` endpoint.
- Mutagen reads tags from MP3, FLAC, M4A, and other supported audio files, then writes Jev updates back to the original file.
- `POST /api/read` and `POST /api/write` expose the file tag operations.
- Empty values and `album_img` are removed before a document is sent.
- `target_field` is restricted to writable music metadata fields.
- The highest-probability (or score) criterion is returned as `metadata_updates`.
- A small capsule-style React UI for editing metadata JSON, prompts, and questions.

## Quick start

```bash
cd /Users/macbookair/coding/jev-music-tag
cp .env.example .env
# Edit .env and set JEV_API_KEY
uv sync
uv run uvicorn backend.main:app --reload --port 8000
```

In another terminal:

```bash
cd /Users/macbookair/coding/jev-music-tag/frontend
npm install
npm run dev
```

The default frontend is `http://localhost:5173`; the API is `http://localhost:8000`. Set `VITE_API_URL` to use another API origin.

The file path entered in the UI is resolved on the **FastAPI server**, not in the browser. Read a file, run a Jev decision, then click “写入文件标签” to persist `metadata_updates`.

## Request example

```json
{
  "metadata": {"title": "主角", "artist": "王菲", "album": "主角"},
  "prompt": "Please carefully determine the local track's style.",
  "questions": {
    "genre": {
      "type": "score",
      "target_field": "genre",
      "instructions": "Choose a style based on the track context.",
      "criteria": ["Pop", "Rock", "Soundtrack"]
    }
  }
}
```

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `JEV_API_KEY` | None | Required; used server-side and never exposed to the browser |
| `JEV_BASE_URL` | `https://api.typesafe.ai` | Jev API base URL |
| `JEV_MODEL_NAME` | `jev-latest` | Model name |

## Structure

```text
backend/main.py       FastAPI API and Jev mapping logic
frontend/src/main.jsx React workbench
frontend/src/styles.css Capsule-style visual styling
pyproject.toml        uv project definition
```

## Scope

This is intentionally a small demo. It does not include a database, authentication, or batch scanning. Add authentication, path allowlisting, redacted request logs, and rate limiting before production use.
