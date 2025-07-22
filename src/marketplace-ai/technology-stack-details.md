# Digital Marketplace AI - Technology Stack

## Architecture Overview

Microservices architecture with React frontend, Express backend, NestJS AI services, ChromaDB vector database, Keycloak authentication, and Azure AI integration.

## Frontend (React Application)

**Core Framework:**

- React 18.2.0
- TypeScript 5.3.0
- Vite 6.3.5
- Tailwind CSS 4.1.8

**AI-Enhanced Editor (Plate.js):**

- @udecode/plate-ai 48.0.5
- @udecode/plate-markdown 48.0.2
- @udecode/plate-basic-elements 48.0.0
- @udecode/plate-basic-marks 48.0.0
...

**AI Chat Interface:**

- CopilotKit (@copilotkit/react-core 1.9.1)
- @ai-sdk/react 1.2.12

**UI Components:**

- Radix UI (alert-dialog, avatar, checkbox, context-menu, dialog, dropdown-menu, popover, separator, slot, toolbar, tooltip)
- Lucide React 0.511.0
- Reactstrap 9.0.0
- Bootstrap 5.3.0


## Backend Services

### Main Application (Express.js)

- Node.js 22.x
- Express.js 4.16.4
- TypeScript 5.3.0
- Knex.js 2.5.1
- PostgreSQL 12 (with Patroni for production HA)
- Keycloak authentication (OpenID Connect)
- jsonwebtoken 9.0.2 (custom JWT generation for AI services)
- OpenID Client 3.15.9
- Cookie Parser 1.4.4
- CORS 2.8.5

### AI Services (NestJS)

- TypeScript 5.7.3
- Node.js 22.x
- NestJS 11.0.1

**AI/ML:**

- LangChain (@langchain/core 0.3.55)
- @xenova/transformers 2.17.2 (all-MiniLM-L6-v2 embeddings)

**Azure AI:**

- @azure/openai 2.0.0
- @azure-rest/ai-inference 1.0.0-beta.6
- @ai-sdk/azure 1.3.23
- @quail-ai/azure-ai-provider 1.2.0
- @azure/core-auth 1.9.0

**Vector DB:**

- ChromaDB 2.4.6 (vector database for embeddings)
- pg 8.16.2 (PostgreSQL client for data sync)

**Auth:**

- @nestjs/jwt 11.0.0
- @nestjs/passport 11.0.5
- passport-jwt 4.0.1
- Passport 0.7.0

## Database & Storage

- **Primary:** PostgreSQL 12 (with Patroni for production HA)
- **Vector:** ChromaDB 1.0.12 for embeddings and semantic search
- **Tools:** Knex.js migrations, pg client

## Authentication & Security

- **Keycloak** with OpenID Connect for main application
- **Custom JWT system** for AI service authentication (jsonwebtoken library, 30min expiration)

## Cloud & Infrastructure

- **Platform:** OpenShift (BC Government Silver Cluster)
- **Containers:** Docker + Docker Compose
- **Cloud AI:** Azure AI Foundry
- **IaC:** Helm Charts, OpenShift Templates, Network Policies
- **Container Registry:** GitHub Container Registry (ghcr.io)
