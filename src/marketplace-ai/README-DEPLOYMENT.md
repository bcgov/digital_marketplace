# Digital Marketplace AI Service - OpenShift Deployment

This document covers the OpenShift deployment specifics for the Digital Marketplace AI service.

## Quick Start

The fastest way to deploy to development:

```bash
# From project root
./scripts/deploy-ai-services.sh dev
```

## Service Overview

- **Port**: 5000
- **Health Check**: `/health`
- **Dependencies**: ChromaDB, PostgreSQL (optional)
- **Environment**: Node.js 18.19, NestJS

## Environment Variables

The following environment variables are configured automatically via OpenShift templates:

### Required
- `NODE_ENV`: Set to "production"
- `PORT`: Service port (5000)
- `CHROMA_URL`: ChromaDB connection URL

### Optional
- `DATABASE_SERVICE_NAME`: PostgreSQL service name
- `DATABASE_URL`: Direct database connection string

### Azure AI (if used)
- `AZURE_AI_ENDPOINT`: Azure AI service endpoint
- `AZURE_AI_API_KEY`: Azure AI service API key
- `USE_AZURE_OPENAI`: Set to "true" to use Azure OpenAI
- `AZURE_OPENAI_ENDPOINT`: Azure OpenAI endpoint
- `AZURE_OPENAI_API_KEY`: Azure OpenAI API key
- `AZURE_OPENAI_DEPLOYMENT_NAME`: Model deployment name
- `AZURE_OPENAI_API_VERSION`: API version (default: 2024-10-01-preview)

## Container Configuration

### Resource Limits
- Development: 50m-200m CPU, 256Mi-512Mi memory
- Test: 100m-300m CPU, 512Mi-1Gi memory
- Production: 200m-500m CPU, 1Gi-2Gi memory

### Scaling
- Development: 2-4 replicas (HPA based on memory usage)
- Test: 2-4 replicas
- Production: 3+ replicas

## Deployment Commands

### Build Only
```bash
./scripts/deploy-ai-services.sh dev build
```

### Deploy Only (assumes image exists)
```bash
./scripts/deploy-ai-services.sh dev deploy
```

### Manual Deployment

If you prefer manual deployment over the script:

```bash
# 1. Build AI service image
oc -n ccc866-tools process -f openshift/templates/ai/ai-digmkt-build.yaml \
  -p ENV_NAME=dev -p GIT_REF=development | oc -n ccc866-tools apply -f -
oc -n ccc866-tools start-build ai-digmkt-dev

# 2. Deploy ChromaDB
oc -n ccc866-dev process -f openshift/templates/database/chroma-digmkt-deploy.yaml \
  -p TAG_NAME=dev | oc -n ccc866-dev apply -f -

# 3. Deploy AI service
oc -n ccc866-dev process -f openshift/templates/ai/ai-digmkt-deploy.yaml \
  -p TAG_NAME=dev \
  -p CHROMA_URL=http://chroma-digmkt-dev:8000 | oc -n ccc866-dev apply -f -
```

## Troubleshooting

### Common Issues

1. **Service won't start**: Check ChromaDB is running first
2. **Health check fails**: Verify the service is listening on port 5000
3. **ChromaDB connection issues**: Check network policies and service names
4. **Build failures**: Ensure Node.js dependencies are properly installed

### Debugging Commands

```bash
# Check all AI-related pods
oc -n ccc866-dev get pods -l app-group=digmkt

# Check AI service logs
oc -n ccc866-dev logs -f dc/ai-digmkt-dev

# Check ChromaDB logs
oc -n ccc866-dev logs -f dc/chroma-digmkt-dev

# Test health endpoints
oc -n ccc866-dev exec -it dc/ai-digmkt-dev -- curl http://localhost:5000/health
oc -n ccc866-dev exec -it dc/chroma-digmkt-dev -- curl http://localhost:8000/api/v1/heartbeat

# Test service connectivity
oc -n ccc866-dev exec -it dc/ai-digmkt-dev -- curl http://chroma-digmkt-dev:8000/api/v1/heartbeat
```

### Performance Monitoring

```bash
# Check resource usage
oc -n ccc866-dev top pods -l app=ai-digmkt-dev

# Check HPA status
oc -n ccc866-dev get hpa ai-digmkt-dev-hpa-mem

# Check persistent volume usage (ChromaDB)
oc -n ccc866-dev get pvc chroma-digmkt-dev-pvc
```

## Integration with Main Application

The main Digital Marketplace application connects to the AI service via:
- **Internal URL**: `http://ai-digmkt-{env}:5000`
- **Environment Variable**: `MARKETPLACE_AI_URL` (configured automatically)

No additional configuration is required in the main application.

## Data Persistence

- **ChromaDB**: Uses persistent volumes for vector embeddings
- **AI Service**: Stateless, no persistent storage required
- **Backup**: ChromaDB data should be included in backup strategies

## Security

- Network policies restrict inter-service communication
- Azure AI secrets are stored as OpenShift secrets
- No external routes created (internal services only)

For full deployment documentation, see [docs/build-deploy/ai-services.md](../../docs/build-deploy/ai-services.md).
