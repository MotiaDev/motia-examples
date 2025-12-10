# RAG and Search

Retrieval-Augmented Generation (RAG) examples for building AI applications with knowledge bases, semantic search, and context-aware responses.

## 📂 Categories

### [RAG Fundamentals](./rag-fundamentals/)
Learn the basics of RAG with different vector databases and embedding models.

### [RAG Applications](./rag-applications/)
Production-ready RAG applications for various use cases.

---

## 🎯 What You'll Learn

- Document parsing and chunking strategies
- Vector embeddings and similarity search
- Vector database integration (ChromaDB, Weaviate, LanceDB, Pinecone)
- Retrieval strategies and optimization
- Context management for AI responses
- Building domain-specific knowledge bases

## 📚 Examples by Category

### RAG Fundamentals

#### [rag-dockling-chromadb-ollama-agent](./rag-fundamentals/rag-dockling-chromadb-ollama-agent)
**Level**: Intermediate  
**Concepts**: Local RAG, ChromaDB, Ollama, Document Processing

Build a fully local RAG system using ChromaDB and Ollama.

**Key Features**:
- Local vector database (ChromaDB)
- Local LLM inference (Ollama)
- Document parsing with Dockling
- Privacy-first approach
- No external API calls

**Best For**: Development, privacy-sensitive applications, cost-conscious projects

---

#### [rag-docling-weaviate-agent](./rag-fundamentals/rag-docling-weaviate-agent)
**Level**: Intermediate  
**Concepts**: Cloud RAG, Weaviate, Hybrid Search

Implement RAG with Weaviate's powerful cloud vector database.

**Key Features**:
- Cloud-native vector database
- Hybrid search (vector + keyword)
- Scalable architecture
- Built-in ML models

**Best For**: Production applications, scalability requirements

---

#### [nvidia-docs-motia](./rag-fundamentals/nvidia-docs-motia)
**Level**: Intermediate  
**Concepts**: Technical Documentation, Domain-Specific RAG

Index and search NVIDIA documentation using RAG.

**Key Features**:
- Technical documentation processing
- Code snippet extraction
- API reference search
- Domain-specific embeddings

**Best For**: Developer tools, documentation search

---

### RAG Applications

#### [airbnb-assistant](./rag-applications/airbnb-assistant)
**Level**: Advanced  
**Concepts**: Property Search, Conversational AI, Pinecone

AI assistant for Airbnb property information powered by RAG.

**Key Features**:
- Property data indexing
- Conversational search
- Pinecone integration
- Notion integration for data management
- Context-aware responses

**Stack**: Pinecone (vectors), Notion (data), OpenAI (embeddings & chat)

---

#### [airbnb-property-guest-assistant](./rag-applications/airbnb-property-guest-assistant)
**Level**: Advanced  
**Concepts**: Guest Support, Email Automation, LanceDB

Automated guest support system with property information retrieval.

**Key Features**:
- LanceDB vector database
- Email integration
- Property documentation RAG
- Guest query handling
- Python implementation

**Stack**: LanceDB, Python, Email service

---

#### [property-search-agent](./rag-applications/property-search-agent)
**Level**: Advanced  
**Concepts**: Real Estate, Multi-Modal Search

Search properties using natural language and images.

**Key Features**:
- Natural language search
- Property metadata indexing
- Location-based filtering
- Price range queries
- Multi-modal capabilities

---

#### [harvest-logbook-rag](./rag-applications/harvest-logbook-rag)
**Level**: Advanced  
**Concepts**: Time Tracking, Domain-Specific Knowledge

Search and analyze Harvest time tracking data using RAG.

**Key Features**:
- Harvest API integration
- Time entry search
- Project analysis
- Custom embeddings for time data

---

#### [motia-research-assistant](./rag-applications/motia-research-assistant)
**Level**: Expert  
**Concepts**: Research Automation, Multi-Agent RAG

Comprehensive research assistant with web search and knowledge synthesis.

**Key Features**:
- Web search integration
- Document collection
- Multi-agent coordination
- Fact checking
- Report generation
- Source citation

**⭐ Highlights**: Complete research pipeline from query to final report

---

#### [research-assistant](./rag-applications/research-assistant)
**Level**: Advanced  
**Concepts**: Academic Research, Paper Analysis

Research assistant for academic papers and scientific literature.

**Key Features**:
- Paper indexing
- Citation tracking
- Semantic search
- Literature review generation

---

## 🚀 Getting Started

### Prerequisites
- Understanding of embeddings and vector similarity
- Familiarity with AI/LLM concepts
- Basic knowledge of databases

### Choose Your Stack

**For Local Development**:
- Start with `rag-dockling-chromadb-ollama-agent`
- No external APIs needed
- Full privacy control

**For Production**:
- Try `rag-docling-weaviate-agent` for scalability
- Or `airbnb-assistant` for a complete implementation

**For Specific Use Cases**:
- Real estate → `property-search-agent`
- Documentation → `nvidia-docs-motia`
- Research → `motia-research-assistant`

### Quick Start
1. Choose an example based on your needs
2. Follow the README in the example directory
3. Set up your vector database
4. Configure API keys (if using cloud services)
5. Index your documents
6. Start querying!

## 📖 Learning Path

### Level 1: Understand RAG Basics
1. **rag-dockling-chromadb-ollama-agent** - Local setup, no complexity
2. Study document chunking strategies
3. Experiment with different embedding models

### Level 2: Production RAG
1. **rag-docling-weaviate-agent** - Cloud-native approach
2. **nvidia-docs-motia** - Domain-specific optimization
3. Learn about hybrid search and reranking

### Level 3: Complex RAG Applications
1. **airbnb-assistant** - Multi-service integration
2. **motia-research-assistant** - Multi-agent RAG
3. Build your own domain-specific RAG system

## 💡 Best Practices

### Document Processing
- **Chunk Size**: Start with 512-1024 tokens, adjust based on your use case
- **Overlap**: Use 10-20% overlap between chunks to maintain context
- **Metadata**: Include rich metadata (source, date, category) for filtering

### Embeddings
- **Model Selection**: OpenAI's text-embedding-3-small for general use
- **Dimensions**: Balance between quality and storage/cost
- **Batch Processing**: Embed documents in batches for efficiency

### Retrieval
- **Top-K**: Start with k=5, adjust based on context window
- **Reranking**: Use reranking for better relevance
- **Hybrid Search**: Combine vector and keyword search for best results

### Cost Optimization
- **Cache Embeddings**: Don't re-embed the same documents
- **Local Models**: Use Ollama for development
- **Batch Operations**: Process documents in batches

## 🔧 Vector Database Comparison

| Database | Best For | Deployment | Cost |
|----------|----------|------------|------|
| **ChromaDB** | Local dev, prototypes | Local | Free |
| **Weaviate** | Production, scale | Cloud/Self-hosted | Varies |
| **LanceDB** | Python apps, simplicity | Local/Cloud | Free/Paid |
| **Pinecone** | Managed service, ease of use | Cloud | Paid |

## 🔗 Next Steps

- **[AI Agents](../ai-agents/)** - Combine RAG with conversational AI
- **[Advanced Use Cases](../advanced-use-cases/)** - Multi-modal RAG systems
- **[Integrations](../integrations/)** - Connect RAG to external services

## 📚 Resources

- [LangChain RAG Guide](https://python.langchain.com/docs/use_cases/question_answering/)
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)
- [ChromaDB Documentation](https://docs.trychroma.com/)
- [Weaviate Documentation](https://weaviate.io/developers/weaviate)
- [State Management Guide](../../.cursor/rules/motia/state-management.mdc)
