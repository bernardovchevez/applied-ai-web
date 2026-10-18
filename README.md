# applied-ai-web

[![CI](https://github.com/bernardovchevez/applied-ai-web/actions/workflows/ci.yml/badge.svg)](https://github.com/bernardovchevez/applied-ai-web/actions/workflows/ci.yml)

Next.js presentation client for the Applied AI Platform (`applied-ai-platform`). Communicates exclusively with the FastAPI presentation BFF over HTTP and Server-Sent Events (SSE).

```
workspace/
├── applied-ai-platform/              <- RAG, agents, pgvector, embed worker, FastAPI BFF
│   └── platform/bff/
├── applied-ai-docs/                  <- Document catalog (SoT) → publish → lake + index events
├── applied-ai-web/                   <- Next.js browser client (this repository)
└── applied-ai-slack/                 <- Slack Bolt client (X-Client-Platform: slack)
```

## Companion repositories

All clients share the same OpenAPI contract (`applied-ai-platform/platform/bff/openapi.yaml`) and talk to the BFF over HTTP/SSE only.

| Repository | Client surface | Header |
|------------|----------------|--------|
| [applied-ai-platform](https://github.com/bernardovchevez/applied-ai-platform) | FastAPI BFF, RAG, agents, MCP | (server) |
| [applied-ai-docs](https://github.com/bernardovchevez/applied-ai-docs) | Catalog UI, publish to lake, ingest events | (catalog) |
| [applied-ai-web](https://github.com/bernardovchevez/applied-ai-web) | Next.js (`/`, `/agent`, `/admin/evals`) | `X-Client-Platform: web` |
| [applied-ai-slack](https://github.com/bernardovchevez/applied-ai-slack) | Slash commands, `@media-ops`, Block Kit approvals | `X-Client-Platform: slack` |

Sample prompts for localhost demos (Slack slash commands and equivalent web chat questions): [applied-ai-slack/docs/local-slack-testing.md#sample-prompts-for-localhost-demos](https://github.com/bernardovchevez/applied-ai-slack/blob/main/docs/local-slack-testing.md#sample-prompts-for-localhost-demos).

## Features

| Route | BFF endpoint | Purpose |
|-------|--------------|---------|
| `/` | `POST /v1/chat/stream` (SSE), `POST /v1/feedback` | Grounded streaming RAG chat with source attribution (`doc_type`, `rights_tier`) and user feedback |
| `/agent` | `POST /v1/agent/run` | Multi-agent production workflow with human-in-the-loop approve/reject gate |
| `/admin/evals` | `GET /v1/evals/summary` | Evaluation dashboard across RAG backends and agent scenarios |

All routes check `GET /health` for live platform status.

## Prerequisites

Documents are **not** edited in this repo. [applied-ai-docs](https://github.com/bernardovchevez/applied-ai-docs) owns the catalog; **Publish** writes `applied-ai-platform/data/lake/raw/` and events for the embed worker. Full walkthrough: [applied-ai-docs/docs/localhost-setup.md](https://github.com/bernardovchevez/applied-ai-docs/blob/main/docs/localhost-setup.md).

1. **Platform:** Postgres/pgvector, Ollama (or OpenAI), **FastAPI BFF** on port 8000:

```bash
cd applied-ai-platform
source .venv/bin/activate
pip install -r platform/bff/requirements-bff.txt
cd platform/bff && ./run.sh --env localhost
```

2. **Document catalog** (sibling checkout): import seed → publish → index:

```bash
cd applied-ai-docs
cp .env.localhost.example .env.localhost
./run.sh
# UI: Import seed library → Publish all pending (optional: run embed worker)
# Or: cd ../applied-ai-platform && python platform/pipelines/embed_worker.py
```

3. **This client** (after `curl -s http://localhost:8000/health` succeeds):

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

## Typecheck & Continuous Integration

GitHub Actions (`.github/workflows/ci.yml`) runs TypeScript validation and a standalone production build on Node 22 on every push and pull request to `main`:

```bash
npm run typecheck          # tsc --noEmit
npm run build:standalone   # NEXT_BUILD_STANDALONE=true next build
```

## Local demo prompts (web UI)

With the BFF running and the Harbor Line corpus **published and embedded** from applied-ai-docs, try these on **`/`** (chat) and **`/agent`** (clearance workflow):

**Chat (RAG):**

- Is the theme song cleared for EMEA streaming?
- Is the Getty archival footage for Harbor Line Episode 4 cleared?
- What locations are locked for Season 1 Episode 4?

**Agent (human approval gate):**

- Prepare clearance summary for Harbor Line S01E04 EMEA launch
- Draft production brief clearance summary for Harbor Line S02E01 EMEA SVOD

More samples (including Slack command syntax): [applied-ai-slack/docs/local-slack-testing.md](https://github.com/bernardovchevez/applied-ai-slack/blob/main/docs/local-slack-testing.md#sample-prompts-for-localhost-demos).

## Architecture contract

- Zero direct imports from Python platform modules; HTTP/SSE only
- Contract defined in `applied-ai-platform/platform/bff/openapi.yaml`
- Client headers: `X-Client-Platform: web`, `X-Session-Id` for trace correlation
