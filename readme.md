# InboxSync – Full Stack (Backend + Frontend)

## Quick Start (Docker)

1. Prereqs: Docker Desktop running
2. Project root: `C:\Users\Ranga Sai\OneDrive\Desktop\InboxSync`
3. Configure env (backend reads `backend/.env`; compose mounts it):

```
# backend/.env
PORT=3000
IMAP_EMAIL_1=your_email_1@gmail.com
IMAP_PASS_1=your_app_password_1
IMAP_EMAIL_2=your_email_2@gmail.com
IMAP_PASS_2=your_app_password_2

# Elasticsearch Cloud
ELASTICSEARCH_HOST=https://<your-elastic-host>:443
ELASTIC_API_KEY=<your_elastic_api_key>

# Gemini
GEMINI_API_KEY=<your_gemini_api_key>

# Optional
SLACK_WEBHOOK_URL=
WEBHOOK_SITE_URL=

# (RAG optional)
QDRANT_URL=
QDRANT_API_KEY=
```

4. Build & Run

```bash
docker compose up -d --build
# or bring services separately
docker compose up -d --build backend
docker compose up -d --build frontend
```

5. Verify

```bash
# Containers
docker compose ps

# Backend health
curl http://localhost:3000/health

# Frontend
# open http://localhost (use http://localhost:8080 if you remap ports)
```

Notes
- Images are named `inboxsync/backend:latest` and `inboxsync/frontend:latest` and appear in Docker Desktop.
- If port 80 is busy, change frontend mapping in `docker-compose.yml` to `"8080:80"`.

## Environment Variables (Summary)

- IMAP: `IMAP_EMAIL_1`, `IMAP_PASS_1`, `IMAP_EMAIL_2`, `IMAP_PASS_2`
- Elasticsearch: `ELASTICSEARCH_HOST`, `ELASTIC_API_KEY`
- Gemini: `GEMINI_API_KEY`
- Optional: `SLACK_WEBHOOK_URL`, `WEBHOOK_SITE_URL`
- RAG optional: `QDRANT_URL`, `QDRANT_API_KEY`

## Dependencies

- Backend: Node 20, Express, TypeScript, `node-imap`, `mailparser`, `@elastic/elasticsearch`, `@google/genai`, `pino`, optional `@qdrant/js-client-rest`
- Frontend: React + Vite (served via Nginx in Docker)

## Architecture (High-level)

- IMAP Sync (IDLE) in `backend/src/imap/imapClient.ts` for real-time delivery
- Indexing & Search in `backend/src/elastic/elasticClient.ts` (index: `emails`)
- AI Categorization in `backend/src/ai/emailCategorizer.ts` (5 labels)
- Suggested Reply (RAG, optional) with Qdrant vector DB
- REST API routes in `backend/src/routes/api.ts`
- Frontend React app calls backend via `/api/*`

## Feature Implementation Breakdown

- Real-time Email Sync: IMAP IDLE, initial 30‑day backfill, unseen fetch on notifications, 29‑min reconnect
- Search: full‑text `multi_match` over `subject` and `body` + filters on `accountId`, `folder`, `aiCategory`; sort by `date desc`
- AI Categorization: Gemini 2.5 Flash with strict JSON schema and tuned prompt; exponential backoff on failure
- Suggested Reply (RAG): retrieve top knowledge chunks from Qdrant, ground the prompt, generate reply; returns reply + context + confidence
- Webhooks (optional): trigger on "Interested" leads to Slack and a generic webhook

---
# ReachInbox Onebox Backend

## Overview

ReachInbox Onebox is a backend service designed for email management and processing. The application is built to handle email operations through IMAP protocols, process email content, and integrate with Elasticsearch for data storage and search capabilities. This is an Express-based Node.js application written in TypeScript that serves as an API for email inbox management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Backend Architecture

**Technology Stack:**
- **Runtime:** Node.js with TypeScript for type safety and better developer experience
- **Web Framework:** Express.js for REST API endpoints
- **Logging:** Pino for structured, high-performance logging

**Design Decisions:**
- TypeScript compilation targets ES2020 with CommonJS modules for broad compatibility
- Strict TypeScript configuration enabled to catch potential errors at compile time
- Source maps and declaration files generated for better debugging and IDE support
- Separation of source (`src/`) and compiled output (`dist/`) directories

### Email Processing Architecture

**IMAP Integration:**
- Uses `node-imap` library for connecting to email servers and fetching messages
- `mailparser` handles parsing of email content, headers, and attachments
- **Real-Time Synchronization:** Implemented in `src/imap/imapClient.ts`
  - Supports two Gmail accounts simultaneously via environment variables
  - Fetches all emails from the last 30 days on initial connection
  - IDLE mode enabled for real-time push notifications of new emails
  - Automatic reconnection every 29 minutes to maintain IDLE connection
  - Comprehensive error handling and graceful degradation

**Implementation Details (October 2025):**
- Date format: Uses RFC-compliant "dd-MMM-yyyy" format for IMAP SINCE searches
- Email parsing: Extracts and logs subject, sender, date, and plain text body
- Multi-account: Each account runs in its own connection with independent IDLE monitoring
- Reconnection strategy: Automatic retry on errors with 5-second delay; scheduled 29-minute refresh
- Logging: Structured logging via Pino with detailed email metadata

**Rationale:** IMAP provides real-time access to email servers, allowing the application to fetch and process emails directly from user mailboxes without requiring email forwarding or complex setup. IDLE mode eliminates the need for polling, providing instant notifications when new emails arrive.

### Data Storage & Search

**Elasticsearch Integration:**
- Primary data store for email content and metadata
- Enables full-text search capabilities across email content
- Version 8.x of the official Elastic client used
- **Implementation:** Located in `src/elastic/elasticClient.ts`
  - Connects using environment variables (ELASTICSEARCH_HOST, ELASTIC_USERNAME, ELASTIC_PASSWORD)
  - Creates "emails" index with predefined mapping on startup
  - Automatically indexes all fetched emails from IMAP sync
  - Graceful degradation when Elasticsearch is unavailable

**Index Mapping (emails):**
- `subject`: text - Email subject line for full-text search
- `body`: text - Email plain text body for full-text search
- `accountId`: keyword - Account email address for filtering
- `folder`: keyword - IMAP folder name (e.g., "INBOX")
- `aiCategory`: keyword - Optional AI-generated category
- `date`: date - Original email timestamp
- `indexedAt`: date - Timestamp when email was indexed

**Implementation Details (October 2025):**
- Index created automatically via `ensureIndex()` function on server startup
- Each fetched email is indexed immediately after parsing
- Supports optional authentication (username/password)
- Error handling ensures IMAP sync continues even if Elasticsearch fails

**Advantages:**
- Fast, scalable search across large email volumes
- Powerful querying and filtering capabilities
- Built-in support for text analysis and relevance scoring

**Trade-offs:** Requires separate Elasticsearch instance to run, adding infrastructure complexity compared to traditional databases.

### AI-Based Email Categorization

**Gemini API Integration:**
- Uses Google's Gemini 2.5 Flash model for intelligent email classification
- Automatically categorizes emails into one of five labels
- **Implementation:** Located in `src/ai/emailCategorizer.ts`
  - Integrated with Replit's Gemini blueprint for secure API key management
  - Categories: "Interested", "Meeting Booked", "Not Interested", "Spam", "Out of Office"
  - JSON schema enforcement ensures consistent, structured responses

**Categorization Flow (October 2025):**
1. Email is indexed in Elasticsearch immediately upon receipt
2. Email subject and body are sent to Gemini API for classification
3. AI returns a structured JSON response with the category
4. Elasticsearch document is updated with the `aiCategory` field
5. Category is logged for monitoring and debugging

**Error Handling & Resilience:**
- **Exponential Backoff:** Retry logic with exponential delays (1s, 2s, 4s) for API failures
- Maximum 3 retry attempts per email to handle rate limits and temporary errors
- Graceful degradation: emails are still indexed even if categorization fails
- Optional feature: only runs when `GEMINI_API_KEY` is configured

**System Prompt Design:**
- Precise instructions define the model's role as an email classifier
- Clear category definitions with usage examples
- Response schema enforces enum constraint for valid categories only

**Advantages:**
- No need to build or train a custom ML model
- Instant deployment with pre-trained model intelligence
- Highly accurate classification based on context and intent
- Scales effortlessly with API-based architecture

**Integration Points:**
- Triggered automatically in IMAP email processing pipeline
- Updates existing Elasticsearch documents after initial indexing
- Supports both historical email sync and real-time new email processing

### AI-Powered Suggested Replies (RAG)

**Retrieval-Augmented Generation System:**
- Intelligent email reply suggestions using Google's Gemini AI and vector search
- Combines product knowledge with email context for relevant, personalized responses
- **Implementation:** Spans multiple services in the backend architecture
  - Vector Database: Qdrant Cloud for storing and searching product knowledge
  - Embedding Service (`src/ai/embeddingService.ts`): Converts text to vectors using Gemini API
  - Vector Storage (`src/vector/vectorStorageService.ts`): Manages product data in Qdrant
  - RAG Orchestrator (`src/ai/ragService.ts`): Coordinates retrieval and generation
  - API Routes (`src/routes/ragRoutes.ts`): Exposes suggest-reply endpoint

**RAG Pipeline Flow (October 2025):**
1. User clicks "Suggest Reply" button in frontend for an email
2. Email content is converted to embeddings using Gemini's text-embedding-004 model
3. Vector database searches for top 3 most relevant product knowledge chunks
4. Retrieved context is combined with email content in a structured prompt
5. Gemini 2.0 Flash generates a professional, context-aware reply
6. Frontend displays the suggested reply with confidence score and context used

**Vector Database Architecture:**
- **Qdrant Collection**: `product_knowledge` stores product data as vectors (768-dimensional)
- **Cosine Similarity**: Used for vector search to find relevant context
- **Product Data Categories**: Features, pricing, support, integrations, security, case studies
- **Seeding**: Default product data automatically loaded on first run (configurable)

**Error Handling & Resilience:**
- **Exponential Backoff**: Retry logic with delays (1s, 2s, 4s) for API failures
- Maximum 3 retry attempts per request
- Graceful degradation: Service continues even if Qdrant is unavailable
- Comprehensive logging of all RAG pipeline stages
- Null-safe response parsing from Gemini API

**Frontend Integration:**
- "Suggest Reply" button in email detail modal
- Loading states during generation (typically 2-5 seconds)
- Display of suggested reply with copy-to-clipboard functionality
- Confidence score badge showing relevance
- Context cards showing which product data was used
- Error handling with user-friendly messages

**API Endpoints:**
- `POST /api/emails/:id/suggest-reply`: Generate suggested reply for an email
- `POST /api/product-data`: Add single product knowledge item
- `POST /api/product-data/batch`: Bulk add product knowledge items
- `GET /api/product-data`: List all product knowledge
- `DELETE /api/product-data/:id`: Remove product knowledge item

**Configuration (October 2025):**
- **QDRANT_URL**: Qdrant Cloud cluster URL (required for RAG features)
- **QDRANT_API_KEY**: Qdrant API key for authentication
- **SEED_PRODUCT_DATA**: Set to 'true' to auto-load default product data
- **GEMINI_API_KEY**: Already configured for email categorization, reused for embeddings and reply generation

**Advantages:**
- No need to manually write replies for common inquiries
- Consistent, professional tone across all suggested replies
- Context-aware responses based on actual product information
- Reduces response time for sales and support teams
- Continuously improvable by updating product knowledge base

**Setup Guide:**
- Detailed setup instructions available in `RAG_SETUP.md`
- Free tier Qdrant Cloud supports ~10,000-50,000 product knowledge vectors
- Estimated cost: ~$0.16 per 1,000 suggested replies (Gemini API)

**Rationale:** RAG combines the power of semantic search with AI generation to produce highly relevant, context-aware email replies. By retrieving specific product information before generating responses, the system avoids generic replies and provides accurate, helpful information tailored to each email's context.

### Webhook Notifications for Interested Leads

**Slack & Generic Webhook Integration:**
- Automatically triggers external notifications when emails are categorized as "Interested"
- Dual notification system for both team awareness and automation workflows
- **Implementation:** Located in `src/webhooks/notificationService.ts`
  - Slack webhook sends formatted rich messages with lead details
  - Generic webhook sends structured JSON for external automation tools
  - Parallel execution using Promise.allSettled for reliability

**Notification Flow (October 2025):**
1. Email is categorized by AI as "Interested"
2. Webhook service is triggered immediately after categorization
3. Slack notification sent with formatted message blocks including subject, sender, date, and body preview
4. Generic webhook triggered with structured JSON payload containing full email metadata
5. Both webhooks execute in parallel and log their results independently

**Slack Notification Format:**
- Rich message blocks with header and formatted fields
- Includes sender, account, subject, date, and email preview
- Visual indicator (🎯) for quick identification in channels
- Configurable via `SLACK_WEBHOOK_URL` environment variable

**Generic Webhook Payload:**
- Event type: "InterestedLead"
- Complete email metadata: subject, sender, account, category, date, document ID
- Body preview (first 500 characters)
- ISO timestamp for event tracking
- Configurable via `WEBHOOK_SITE_URL` environment variable

**Error Handling & Resilience:**
- Independent error handling for each webhook destination
- Failed webhook deliveries don't block email processing
- Comprehensive logging of all webhook attempts and responses
- HTTP status checking with detailed error messages
- Graceful degradation if webhook URLs are not configured

**Use Cases:**
- **Slack:** Real-time team notifications for sales leads
- **Generic Webhook:** Integration with CRM, marketing automation, or custom workflows
- **Automation:** Trigger follow-up sequences, task creation, or lead scoring

**Configuration:**
- Optional feature: webhooks only fire when URLs are configured
- `SLACK_WEBHOOK_URL`: Slack incoming webhook URL (get from Slack workspace settings)
- `WEBHOOK_SITE_URL`: Generic webhook endpoint (e.g., webhook.site, Zapier, Make.com, custom endpoints)

### API Design

**RESTful Endpoints:**
- Health check endpoint (`/health`) for monitoring
- JSON-based request/response format
- Environment-based configuration through dotenv

**Considerations:**
- Simple, stateless API design for easy scaling
- Health endpoint allows load balancers and monitoring tools to verify service status

### Configuration Management

**Environment Variables:**
- Port configuration (defaults to 3000)
- Log level configuration
- Expected to include IMAP credentials and Elasticsearch connection details

**Benefits:** Separates configuration from code, allowing different settings per environment without code changes.

## External Dependencies

### Core Services

**Elasticsearch:**
- Purpose: Primary data storage and search engine
- Version: 8.x
- Client: `@elastic/elasticsearch` official package
- Integration: Used for storing and searching email data

**Email Services:**
- Protocol: IMAP (Internet Message Access Protocol)
- Libraries:
  - `node-imap`: IMAP client for connecting to email servers
  - `mailparser`: Parsing email content and extracting metadata

### Supporting Libraries

**HTTP & Utilities:**
- `node-fetch`: HTTP client for making external API calls
- `express`: Web application framework
- `dotenv`: Environment variable management
- `pino`: Structured logging

### Development Dependencies

- TypeScript compiler and type definitions
- `ts-node`: Direct TypeScript execution for development
- Type definitions for Node.js and Express