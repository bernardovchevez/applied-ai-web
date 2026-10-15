# applied-ai-web

Next.js presentation client for the Applied AI Platform (`applied-ai-platform`). Communicates exclusively with the FastAPI presentation BFF over HTTP and Server-Sent Events (SSE).

```
workspace/
├── applied-ai-platform/              <- Platform (RAG, MCP server, LangGraph agents, pgvector, FastAPI BFF)
│   └── platform/bff/
└── applied-ai-web/                   <- Next.js client (this repository)
```

## Features

| Route | BFF endpoint | Purpose |
|-------|--------------|---------|
| `/` Chat | `POST /v1/chat/stream` (SSE) | Grounded streaming RAG chat with source attribution and user feedback |
| `/agent` | `POST /v1/agent/run` | Multi-agent production workflow with human-in-the-loop approve/reject gate |
| `/admin/evals` | `GET /v1/evals/summary` | Evaluation dashboard across RAG backends and agent scenarios |

All routes check `GET /health` for live platform status.

## Prerequisites

1. **FastAPI BFF** running from `applied-ai-platform`:

```bash
cd applied-ai-platform
source .venv/bin/activate
pip install -r platform/bff/requirements-bff.txt
cd platform/bff
uvicorn main:app --reload --port 8000
```

2. Platform dependencies: Docker `pgvector`, Ollama (or OpenAI API key), and ingested synthetic corpus (see `applied-ai-platform/README.md`).

## Setup

```bash
cd applied-ai-web
cp .env.local.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_BFF_URL` | `http://localhost:8000` | FastAPI BFF base URL |

## Architecture contract

- Zero direct imports from Python platform modules; HTTP/SSE only
- Contract defined in `applied-ai-platform/platform/bff/openapi.yaml`
- Client headers: `X-Client-Platform: web`, `X-Session-Id` for trace correlation
