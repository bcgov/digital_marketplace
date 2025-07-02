# Digital Marketplace AI Services Deployment Guide

This guide covers the deployment of the Digital Marketplace AI services, including the NestJS-based AI service and ChromaDB vector database.

## Architecture Overview

The AI services complement the main Digital Marketplace application with:

- **AI Service**: NestJS application (port 5000) providing AI/ML capabilities
- **ChromaDB**: Vector database (port 8000) for embeddings and semantic search
- **Main App**: Updated to communicate with AI services

## Prerequisites

- Same prerequisites as main application deployment
- Additional storage requirements for ChromaDB persistent volumes
- Network policies configured for secure inter-service communication

## Deployment Order

**IMPORTANT**: Services must be deployed in this specific order due to dependencies:

1. **ChromaDB** (database dependency)
2. **AI Service** (depends on ChromaDB)
3. **Main Application** (updated with AI service integration)

---

## ChromaDB Deployment

### Development Environment

```bash
# Deploy ChromaDB to development
oc -n ccc866-dev process -f openshift/templates/database/chroma-digmkt-deploy.yaml \
  -p TAG_NAME=dev \
  -p PVC_SIZE=10Gi | oc -n ccc866-dev apply -f -
```

### Test Environment

```bash
# Deploy ChromaDB to test
oc -n ccc866-test process -f openshift/templates/database/chroma-digmkt-deploy.yaml \
  -p TAG_NAME=test \
  -p PVC_SIZE=20Gi | oc -n ccc866-test apply -f -
```

### Production Environment

```bash
# Deploy ChromaDB to production
oc -n ccc866-prod process -f openshift/templates/database/chroma-digmkt-deploy.yaml \
  -p TAG_NAME=prod \
  -p PVC_SIZE=50Gi \
  -p CPU_REQUEST=50m \
  -p CPU_LIMIT=200m \
  -p MEMORY_REQUEST=256Mi \
  -p MEMORY_LIMIT=1Gi | oc -n ccc866-prod apply -f -
```

---

## AI Service Build Configs

### Build Images for All Environments

```bash
# Development
oc -n ccc866-tools process -f openshift/templates/ai/ai-digmkt-build.yaml \
  -p ENV_NAME=dev -p GIT_REF=development | oc -n ccc866-tools apply -f -
oc -n ccc866-tools start-build ai-digmkt-dev

# Test
oc -n ccc866-tools process -f openshift/templates/ai/ai-digmkt-build.yaml \
  -p ENV_NAME=test -p GIT_REF=master | oc -n ccc866-tools apply -f -
oc -n ccc866-tools start-build ai-digmkt-test

# Production
oc -n ccc866-tools process -f openshift/templates/ai/ai-digmkt-build.yaml \
  -p ENV_NAME=prod -p GIT_REF=master | oc -n ccc866-tools apply -f -
oc -n ccc866-tools start-build ai-digmkt-prod
```

---

## AI Service Deployment

### Development Environment

```bash
# Deploy AI Service to development
oc -n ccc866-dev process -f openshift/templates/ai/ai-digmkt-deploy.yaml \
  -p TAG_NAME=dev \
  -p CHROMA_URL=http://chroma-digmkt-dev:8000 \
  -p DATABASE_SERVICE_NAME=patroni-pg12 | oc -n ccc866-dev apply -f -
```

### Test Environment

```bash
# Deploy AI Service to test
oc -n ccc866-test process -f openshift/templates/ai/ai-digmkt-deploy.yaml \
  -p TAG_NAME=test \
  -p CHROMA_URL=http://chroma-digmkt-test:8000 \
  -p DATABASE_SERVICE_NAME=patroni-pg12 \
  -p CPU_REQUEST=100m \
  -p CPU_LIMIT=300m \
  -p MEMORY_REQUEST=512Mi \
  -p MEMORY_LIMIT=1Gi | oc -n ccc866-test apply -f -
```

### Production Environment

```bash
# Deploy AI Service to production
oc -n ccc866-prod process -f openshift/templates/ai/ai-digmkt-deploy.yaml \
  -p TAG_NAME=prod \
  -p CHROMA_URL=http://chroma-digmkt-prod:8000 \
  -p DATABASE_SERVICE_NAME=patroni-pg12 \
  -p REPLICAS=3 \
  -p CPU_REQUEST=200m \
  -p CPU_LIMIT=500m \
  -p MEMORY_REQUEST=1Gi \
  -p MEMORY_LIMIT=2Gi | oc -n ccc866-prod apply -f -
```

---

## Network Policies (Optional)

For enhanced security, deploy network policies to restrict inter-service communication:

```bash
# Development
oc -n ccc866-dev process -f openshift/templates/network/ai-network-policy.yaml \
  -p TAG_NAME=dev | oc -n ccc866-dev apply -f -

# Test
oc -n ccc866-test process -f openshift/templates/network/ai-network-policy.yaml \
  -p TAG_NAME=test | oc -n ccc866-test apply -f -

# Production
oc -n ccc866-prod process -f openshift/templates/network/ai-network-policy.yaml \
  -p TAG_NAME=prod | oc -n ccc866-prod apply -f -
```

---

## Updated Main Application Deployment

The main application templates have been updated to include AI service URLs. Use the existing deployment process with these additional parameters automatically configured:

- `MARKETPLACE_AI_URL`: Points to the AI service
- `CHROMA_URL`: Points to ChromaDB (for any direct access needed)

---

## Service URLs

### Internal Service Discovery

Services communicate using OpenShift internal DNS:

- **AI Service**: `http://ai-digmkt-{env}:5000`
- **ChromaDB**: `http://chroma-digmkt-{env}:8000`
- **Main App**: `http://app-digmkt-{env}:3000`

### Health Check Endpoints

- **AI Service**: `http://ai-digmkt-{env}:5000/health`
- **ChromaDB**: `http://chroma-digmkt-{env}:8000/api/v1/heartbeat`

---

## Environment Variables

### AI Service Configuration

The AI service requires these environment variables (configured automatically via templates):

- `NODE_ENV`: Set to "production"
- `PORT`: Service port (5000)
- `CHROMA_URL`: ChromaDB connection URL
- `DATABASE_SERVICE_NAME`: PostgreSQL service name
- `DATABASE_URL`: Optional direct database connection

### Azure AI Integration

If using Azure AI services, additional secrets may need to be configured:

```bash
# Example secret creation (replace with actual values)
oc -n ccc866-{env} create secret generic ai-azure-secrets \
  --from-literal=AZURE_AI_ENDPOINT="https://your-endpoint.cognitiveservices.azure.com/" \
  --from-literal=AZURE_AI_API_KEY="your-api-key"
```

---

## Monitoring and Troubleshooting

### Check Deployment Status

```bash
# Check all AI-related pods
oc -n ccc866-{env} get pods -l app-group=digmkt

# Check AI service logs
oc -n ccc866-{env} logs -f dc/ai-digmkt-{env}

# Check ChromaDB logs
oc -n ccc866-{env} logs -f dc/chroma-digmkt-{env}
```

### Service Connectivity Tests

```bash
# Test AI service health
oc -n ccc866-{env} exec -it dc/app-digmkt-{env} -- curl http://ai-digmkt-{env}:5000/health

# Test ChromaDB health
oc -n ccc866-{env} exec -it dc/ai-digmkt-{env} -- curl http://chroma-digmkt-{env}:8000/api/v1/heartbeat
```

### Storage Information

```bash
# Check ChromaDB persistent volume usage
oc -n ccc866-{env} get pvc chroma-digmkt-{env}-pvc
oc -n ccc866-{env} describe pvc chroma-digmkt-{env}-pvc
```

---

## Scaling and Performance

### Horizontal Pod Autoscaling

The AI service includes HPA configuration:
- **Development**: 2-4 replicas based on memory usage (80%)
- **Test/Production**: Adjust based on load requirements

### Resource Recommendations

| Environment | AI Service CPU | AI Service Memory | ChromaDB CPU | ChromaDB Memory | ChromaDB Storage |
|-------------|----------------|-------------------|--------------|-----------------|------------------|
| Development | 50m-200m       | 256Mi-512Mi       | 25m-100m     | 128Mi-512Mi     | 10Gi             |
| Test        | 100m-300m      | 512Mi-1Gi         | 50m-200m     | 256Mi-1Gi       | 20Gi             |
| Production  | 200m-500m      | 1Gi-2Gi           | 100m-500m    | 512Mi-2Gi       | 50Gi+            |

---

## Data Migration

### Migrating Existing ChromaDB Data

If you have existing ChromaDB data in `chroma_data/`, you'll need to migrate it:

1. **Create a migration job** to copy data from local `chroma_data/` to the OpenShift PVC
2. **Use `oc rsync`** to transfer data during initial deployment
3. **Consider downtime** during migration for data consistency

Example migration approach:

```bash
# Scale down ChromaDB temporarily
oc -n ccc866-{env} scale dc/chroma-digmkt-{env} --replicas=0

# Start a temporary pod with the PVC mounted
oc -n ccc866-{env} run migration-pod --image=busybox --restart=Never \
  --overrides='{"spec":{"containers":[{"name":"migration","image":"busybox","command":["sleep","3600"],"volumeMounts":[{"name":"chroma-data","mountPath":"/data"}]}],"volumes":[{"name":"chroma-data","persistentVolumeClaim":{"claimName":"chroma-digmkt-{env}-pvc"}}]}}'

# Copy data using oc rsync
oc -n ccc866-{env} rsync ./chroma_data/ migration-pod:/data/

# Clean up and scale back up
oc -n ccc866-{env} delete pod migration-pod
oc -n ccc866-{env} scale dc/chroma-digmkt-{env} --replicas=1
```

---

## Rollback Strategy

To rollback AI services:

1. **Scale down AI service**: `oc -n ccc866-{env} scale dc/ai-digmkt-{env} --replicas=0`
2. **Update main app** to disable AI features (if feature-flagged)
3. **Keep ChromaDB running** (data preserved)
4. **Remove network policies** if needed

The main application should continue to function normally even if AI services are unavailable.

---

## Security Considerations

- **Network Policies**: Restrict communication to necessary service pairs only
- **Secrets Management**: Store Azure AI keys and database credentials as OpenShift secrets
- **RBAC**: Ensure proper role-based access control for AI service deployments
- **Data Privacy**: Consider data residency requirements for AI processing

---

## CI/CD Integration

The GitHub Actions workflow has been updated to build both application and AI service images automatically. Manual deployment is still required using the commands above.

For automated deployments, consider extending the existing GitHub Actions workflow to include deployment steps for the AI services.
