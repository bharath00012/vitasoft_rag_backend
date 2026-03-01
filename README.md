# 🤖 Session-Based RAG Application

A **Session-Based Retrieval-Augmented Generation (RAG)** application built as part of the Vitasoft Full-Stack / AI-ML Technical Assessment. Users upload PDF or TXT documents, which are processed and embedded in the backend. Questions are answered strictly based on the uploaded content — hallucinations are prevented via cosine-similarity guardrails.

---

## 📋 Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Setup Instructions](#setup-instructions)
4. [Architecture Overview](#architecture-overview)
5. [Chunking Strategy](#chunking-strategy)
6. [Retrieval Flow](#retrieval-flow)
7. [Guardrail Logic](#guardrail-logic)
8. [API Endpoints](#api-endpoints)
9. [Third-Party Packages](#third-party-packages)
10. [Known Limitations & Future Improvements](#known-limitations--future-improvements)

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React + TypeScript + CSS |
| **Backend** | Node.js + Express.js + TypeScript |
| **Embeddings** | OpenAI `text-embedding-3-small` |
| **LLM** | OpenAI `gpt-4o-mini` |
| **Vector Store** | ChromaDB (session-isolated collections) |
| **Database** | MongoDB (Mongoose) — session & chat history |
| **File Parsing** | `pdfjs-dist` (PDF), native `fs` (TXT) |

---

## 📁 Project Structure

```
vitasoft_rag/
├── backend/
│   └── rag_backend/
│       ├── src/
│       │   ├── index.ts                  # Express entry point
│       │   ├── config/
│       │   │   ├── db.ts                 # MongoDB connection
│       │   │   └── rag.config.ts         # Configurable RAG parameters
│       │   ├── routes/
│       │   │   ├── upload.route.ts       # File upload, chunking, embedding
│       │   │   ├── query.route.ts        # Question answering + chat history
│       │   │   ├── session.route.ts      # Session CRUD
│       │   │   └── ragConfig.route.ts    # Live RAG config updates
│       │   ├── services/
│       │   │   ├── embedding.service.ts  # OpenAI embeddings + normalization
│       │   │   ├── chroma.service.ts     # ChromaDB client + collection management
│       │   │   ├── retriever.ts          # Cosine similarity, Top-K, guardrails, prompt builder
│       │   │   └── rag.service.ts        # Main RAG orchestration + chat memory
│       │   ├── chunking/
│       │   │   └── chunker.ts            # Sliding-window text chunker
│       │   ├── loaders/
│       │   │   └── pdf.loader.ts         # PDF and TXT text extractor
│       │   └── models/
│       │       ├── session.model.ts      # Mongoose session schema
│       │       └── chat.model.ts         # Mongoose chat history schema
│       ├── .env.example
│       ├── package.json
│       └── tsconfig.json
├── frontend/
│   └── project (3)/
│       └── project (2)/
│           └── project/
│               └── rag-frontend/         # React frontend application
└── README.md
```

---

## ⚙️ Setup Instructions

### Prerequisites

- **Node.js** `>= 18.x`
- **Python** `>= 3.8` (required by ChromaDB)
- **MongoDB** running locally or a MongoDB Atlas URI
- **ChromaDB** server running locally
- **OpenAI API Key**

---

### 1. Start ChromaDB

```bash
pip install chromadb
chroma run --host localhost --port 8000
```

### 2. Start MongoDB

Make sure MongoDB is running on `mongodb://127.0.0.1:27017` or update the URI in `.env`.

---

### 3. Backend Setup

```bash
cd backend/rag_backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

Edit `.env`:

```env
OPENAI_API_KEY=your_openai_api_key_here
MONGO_URI=mongodb://127.0.0.1:27017/ragdb
CHROMA_URL=http://localhost:8000
PORT=5000
FRONTEND_URL=http://localhost:3000

# Optional: Override chunking defaults
CHUNK_SIZE=500
CHUNK_OVERLAP=50
```

Start the backend:

```bash
# Development (with hot-reload)
npm run dev

# Production
npm run build
npm start
```

The backend runs on **http://localhost:5000**.

---

### 4. Frontend Setup

```bash
cd frontend/project\ \(3\)/project\ \(2\)/project/rag-frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend runs on **http://localhost:3000** (or the port shown in your terminal).

---

## 🏗 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                       FRONTEND (React)                      │
│   File Upload → Session Display → Chat Interface → Results  │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTP
┌────────────────────────────▼────────────────────────────────┐
│                   BACKEND (Express + TypeScript)            │
│                                                             │
│  POST /upload  → Parse → Chunk → Embed → Store in ChromaDB  │
│  POST /query   → Embed Question → Cosine Similarity         │
│                → Guardrail Check → Build Prompt → OpenAI    │
│  GET/POST/DELETE /sessions  → Session CRUD (MongoDB)        │
│  GET/PUT /rag-config        → Live parameter updates        │
└────────────────────────────┬────────────────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
         ChromaDB        MongoDB         OpenAI API
     (Vector Storage)  (Sessions,     (Embeddings +
    per-session coll.   Chat Hist.)       LLM)
```

### Key Design Decisions

- **Session Isolation**: Each session gets its own ChromaDB collection (`session_{sessionId}`) and MongoDB document. No data leaks between sessions.
- **Pre-normalized Embeddings**: All embeddings are L2-normalized before storage. This allows cosine similarity to be computed as a fast dot-product — no repeated `sqrt` calls.
- **Context-Aware Querying**: The query embedding is enriched by appending the last assistant/user message, enabling follow-up question understanding.
- **Chat Memory**: In-memory `Map` keeps the last 10 messages per session for multi-turn conversation context sent to the LLM.

---

## ✂️ Chunking Strategy

**Location:** `src/chunking/chunker.ts`

The system uses a **sliding-window character-level chunker**:

| Parameter | Default | Environment Variable |
|---|---|---|
| `chunkSize` | `500` characters | `CHUNK_SIZE` |
| `chunkOverlap` | `50` characters | `CHUNK_OVERLAP` |

**How it works:**

```
Text: [------------------------------------...----]
       ↑         ↑         ↑
  Chunk 1     Chunk 2   Chunk 3
  [0 → 500]  [450 → 950] [900 → 1400]
         ↑50↑       ↑50↑   (overlap)
```

- **Overlap** ensures that context at chunk boundaries is not lost. A sentence split across chunk boundary will appear in both adjacent chunks.
- Chunks shorter than **30 characters** are filtered out (noise/whitespace removal).
- Parameters are **configurable at runtime** via the `/rag-config` endpoint — no restart needed.

**Embedding batching:** Chunks are embedded in batches of 100 to stay within OpenAI's API rate limits and reduce latency.

---

## 🔍 Retrieval Flow

**Location:** `src/services/retriever.ts`, `src/services/rag.service.ts`

```
User Question
     │
     ▼
1. Embed Question
   (OpenAI text-embedding-3-small → normalized vector)
     │
     ▼
2. Load All Chunks for Session
   (from ChromaDB collection `session_{sessionId}`)
     │
     ▼
3. Compute Cosine Similarity
   For each stored chunk embedding:
   similarity = dot(query_vec, chunk_vec)   ← fast because pre-normalized
     │
     ▼
4. Sort by Score Descending → Take Top K
   (default K = 5, configurable)
     │
     ▼
5. Guardrail Check
   if best_score < similarityThreshold (default 0.20):
       → Return: "This question is outside the scope..."
   else:
       → Proceed to LLM
     │
     ▼
6. Build Prompt
   Context: top K chunks (capped at ~3000 chars)
   System prompt: strict document-only answer instruction
     │
     ▼
7. Call GPT-4o-mini
   model="gpt-4o-mini", temperature=0, max_tokens=1024
     │
     ▼
8. Return answer + similarity score to frontend
```

**Cosine Similarity Implementation (manual, as required):**

```typescript
// src/services/retriever.ts
export function cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    for (let i = 0; i < a.length; i++) {
        dot += (a[i] ?? 0) * (b[i] ?? 0);
    }
    return Math.min(1, Math.max(-1, dot)); // Clamp for floating point safety
}
```

Since all vectors are pre-normalized (L2 norm = 1), the cosine similarity equals the dot product — no square root computation needed. This is the **bonus optimization** from the assessment.

---

## 🛡️ Guardrail Logic

**Location:** `src/services/retriever.ts` → `isInScope()`, `buildPrompt()`

The system uses **two layers** of guardrails to prevent hallucinations:

### Layer 1 — Similarity Threshold Gate

```typescript
export function isInScope(topChunks: RetrievedChunk[], config?): boolean {
    const threshold = config?.similarityThreshold ?? 0.20;
    const bestScore = topChunks[0]?.score ?? 0;
    return bestScore >= threshold; // false → reject before LLM is ever called
}
```

If the best cosine similarity score between the question and any stored chunk is below `0.20`, the LLM is **never called**. The API immediately returns:

> *"This question is outside the scope of uploaded documents."*

### Layer 2 — Strict System Prompt

Even when the similarity threshold is met, the system prompt explicitly forbids the model from using external knowledge:

```
You are a precise document Q&A assistant.
Answer the user's question ONLY using the context provided below.
Do NOT use any knowledge outside of the provided context.
If the answer cannot be found in the context, respond EXACTLY with:
"This question is outside the scope of uploaded documents."
```

The LLM operates with `temperature=0` to ensure deterministic, grounded responses.

### Configurable Parameters

| Parameter | Default | Description |
|---|---|---|
| `similarityThreshold` | `0.20` | Minimum score to consider question in-scope |
| `topK` | `5` | Number of chunks passed to LLM |
| `chunkSize` | `500` | Characters per chunk |
| `chunkOverlap` | `50` | Overlap between adjacent chunks |

All parameters can be updated live via `PUT /rag-config` without restarting the server.

---

## 🌐 API Endpoints

### Upload

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/upload` | Upload PDF/TXT, process, embed, store |

**Body (multipart/form-data):** `file`, `sessionId`

**Response:**
```json
{
  "message": "File processed successfully",
  "chunksCreated": 42
}
```

---

### Query

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/query` | Ask a question |
| `GET` | `/query/history/:sessionId` | Get chat history |
| `DELETE` | `/query/history/:sessionId` | Delete chat history |

**Body (JSON):** `{ "sessionId": "...", "question": "..." }`

**Response:**
```json
{
  "answer": "...",
  "score": 0.847
}
```

---

### Sessions

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/sessions` | Create/register a session |
| `GET` | `/sessions` | List all sessions |
| `GET` | `/sessions/:sessionId` | Get session + chat history |
| `DELETE` | `/sessions/:sessionId` | Delete session + all data |
| `DELETE` | `/sessions/:sessionId/chats` | Clear chat history only |

---

### RAG Config

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/rag-config` | Get current RAG parameters |
| `PUT` | `/rag-config` | Update RAG parameters live |
| `POST` | `/rag-config/reset` | Reset to defaults |

---

## 📦 Third-Party Packages

### Backend

| Package | Version | Purpose |
|---|---|---|
| `express` | `^5.2.1` | HTTP server framework |
| `openai` | `^6.25.0` | OpenAI API client for embeddings (`text-embedding-3-small`) and LLM (`gpt-4o-mini`) |
| `chromadb` | `^3.3.1` | Vector database for session-isolated embedding storage and similarity search |
| `mongoose` | `^9.2.2` | MongoDB ODM for session metadata and chat history persistence |
| `multer` | `^2.0.2` | Multipart file upload handling (PDF/TXT) |
| `pdfjs-dist` | `^5.4.624` | Mozilla's PDF.js — robust PDF text extraction without native deps |
| `uuid` | `^13.0.0` | Generates unique IDs for each stored chunk in ChromaDB |
| `dotenv` | `^17.3.1` | Environment variable management |
| `cors` | `^2.8.6` | Cross-Origin Resource Sharing for frontend-backend communication |
| `ts-node-dev` | `^2.0.0` | Development server with TypeScript hot-reload |

**Why ChromaDB over in-memory?**
ChromaDB was chosen as the bonus vector DB integration. It provides persistent, session-isolated collections that survive server restarts — unlike a plain `Map<string, number[]>`. The mandatory in-memory path is also preserved since all vectors are loaded into memory during query time for the cosine similarity calculation.

**Why `pdfjs-dist` for PDF parsing?**
`pdf-parse` (v1.x/v2.x) had significant compatibility issues with CommonJS/ESM boundaries in Node 18+. `pdfjs-dist` (Mozilla's official library) provides a stable, well-maintained ESM-compatible parser with layout-aware text extraction, preserving reading order.

**Why `text-embedding-3-small`?**
Excellent balance of quality and cost. 1536-dimensional vectors are sufficient for document retrieval at this scale. The model also supports dimensionality reduction if needed.

---

## ⚠️ Known Limitations & Future Improvements

### Known Limitations

| Limitation | Details |
|---|---|
| **Server restart clears chat memory** | The `chatMemory` Map in `rag.service.ts` is in-process. Chat context is lost on restart. MongoDB chat history is persisted, but the LLM context window is not. |
| **Scanned PDFs not supported** | `pdfjs-dist` extracts digital text only. Image-based/scanned PDFs return empty text. |
| **ChromaDB local dependency** | Requires a running ChromaDB Python server. This adds an operational dependency not suitable for serverless deployment. |
| **Single file per session** | The current session model tracks only one uploaded file. Multi-file support requires a schema change. |
| **No auth / user accounts** | Session IDs are UUID-based and client-generated. Anyone with a sessionId can access that session's data. |
| **Fixed LLM model** | Model is hardcoded to `gpt-4o-mini`. Switching models requires a code change. |

### Future Improvements

- [ ] **Persist chat memory** in MongoDB to survive server restarts
- [ ] **OCR support** via Tesseract.js for scanned PDFs
- [ ] **Multi-file per session** — allow accumulating documents within a session
- [ ] **Authentication** — JWT-based user auth to scope sessions to users
- [ ] **Streaming responses** — Use OpenAI streaming to display answers token-by-token
- [ ] **Pinecone integration** — Cloud-native vector DB for production scalability
- [ ] **Token counting** — Use `tiktoken` to precisely cap context within LLM token limits
- [ ] **Adjustable retrieval UI** — Frontend sliders for `topK`, `chunkSize`, and `similarityThreshold`
- [ ] **Response time logging** — Measure and expose embedding + LLM latency metrics
- [ ] **Dockerization** — Docker Compose for one-command startup of all services

---


## 🔐 Environment Variables Reference

```env
# OpenAI
OPENAI_API_KEY=sk-...

# MongoDB
MONGO_URI=mongodb://127.0.0.1:27017/ragdb

# ChromaDB
CHROMA_URL=http://localhost:8000

# Server
PORT=5000

# CORS
FRONTEND_URL=http://localhost:3000

# Chunking (optional overrides)
CHUNK_SIZE=500
CHUNK_OVERLAP=50
```
