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

## Environments (Localhost, Stage & Production)

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_APP_ENV` | `localhost` | Runtime environment badge and mode (`localhost`, `stage`, `production`) |
| `NEXT_PUBLIC_BFF_URL` | `http://localhost:8000` | FastAPI BFF base URL |
| `NEXT_PUBLIC_BFF_API_KEY` | *(empty)* | Optional Bearer API key when `BFF_API_KEY` is set on the BFF (`stage` / `production`) |

Environment templates included in this repo:
- `.env.local.example` / `.env.localhost.example` (points to `http://localhost:8000`)
- `.env.stage.example` (points to stage BFF with `NEXT_PUBLIC_APP_ENV=stage`)
- `.env.production.example` (points to production BFF with `NEXT_PUBLIC_APP_ENV=production`)

### Build & Run by Environment

```bash
# Localhost dev
npm run dev

# Stage build
cp .env.stage.example .env.stage
npm run build:stage

# Production build (Vercel or standard Node server)
cp .env.production.example .env.production
npm run build:prod && npm run start

# Docker standalone production build
docker build \
  --build-arg NEXT_PUBLIC_APP_ENV=production \
  --build-arg NEXT_PUBLIC_BFF_URL=https://api.example-media.com \
  -t applied-ai-web:prod .
docker run -p 3000:3000 applied-ai-web:prod
```

## Architecture contract

- Zero direct imports from Python platform modules; HTTP/SSE only
- Contract defined in `applied-ai-platform/platform/bff/openapi.yaml`
- Client headers: `X-Client-Platform: web`, `X-Session-Id` for trace correlation
