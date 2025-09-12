# Event Flow Separation

## Weaviate Flow
```
POST /api/rag/process-pdfs
    ↓
emits: rag.read.pdfs
    ↓
subscribers:
  - read-pdfs.step.ts
  - init-weaviate.step.ts
    ↓
read-pdfs.step.ts emits: rag.process.pdfs
    ↓
subscribers:
  - process-pdfs.step.py
    ↓
process-pdfs.step.py emits: rag.chunks.ready
    ↓
subscribers:
  - load-weaviate.step.ts
    ↓
load-weaviate.step.ts emits: rag.chunks.loaded
```

## ChromaDB Flow
```
POST /api/rag/process-pdfs-chromadb
    ↓
emits: rag.read.pdfs.chromadb
    ↓
subscribers:
  - read-pdfs-chromadb.step.ts
  - init-chromadb.step.ts
    ↓
read-pdfs-chromadb.step.ts emits: rag.process.pdfs.chromadb
    ↓
subscribers:
  - process-pdfs-chromadb.step.py
    ↓
process-pdfs-chromadb.step.py emits: rag.chunks.ready.chromadb
    ↓
subscribers:
  - load-chromadb.step.ts
    ↓
load-chromadb.step.ts emits: rag.chunks.loaded.chromadb
```

## Key Changes Made

1. **Separate Event Topics**: Each vector database now has its own event topics:
   - Weaviate: `rag.read.pdfs`, `rag.process.pdfs`, `rag.chunks.ready`, `rag.chunks.loaded`
   - ChromaDB: `rag.read.pdfs.chromadb`, `rag.process.pdfs.chromadb`, `rag.chunks.ready.chromadb`, `rag.chunks.loaded.chromadb`

2. **Separate Event Steps**: Created dedicated steps for ChromaDB:
   - `read-pdfs-chromadb.step.ts`
   - `process-pdfs-chromadb.step.py`
   - Updated `init-chromadb.step.ts` and `load-chromadb.step.ts` to use ChromaDB-specific events

3. **Isolated Workflows**: Each API endpoint now triggers only its respective vector database workflow, preventing cross-contamination.

## Result
- `/api/rag/process-pdfs` → Only processes and stores in Weaviate
- `/api/rag/process-pdfs-chromadb` → Only processes and stores in ChromaDB
- No more shared event topics between the two vector databases
