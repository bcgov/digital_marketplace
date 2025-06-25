#!/bin/bash

# Digital Marketplace AI Services Deployment Script
# Usage: ./scripts/deploy-ai-services.sh <environment> [action]
# Environment: dev, test, prod
# Action: build, deploy, all (default)

set -e

ENVIRONMENT=${1:-dev}
ACTION=${2:-all}

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|test|prod)$ ]]; then
    echo "Error: Environment must be one of: dev, test, prod"
    exit 1
fi

# Set environment-specific variables
case $ENVIRONMENT in
    dev)
        NAMESPACE="ccc866-dev"
        TOOLS_NAMESPACE="ccc866-tools"
        GIT_REF="development"
        CHROMA_PVC_SIZE="10Gi"
        AI_REPLICAS="2"
        AI_CPU_REQUEST="50m"
        AI_CPU_LIMIT="200m"
        AI_MEMORY_REQUEST="256Mi"
        AI_MEMORY_LIMIT="512Mi"
        CHROMA_CPU_REQUEST="25m"
        CHROMA_CPU_LIMIT="100m"
        CHROMA_MEMORY_REQUEST="128Mi"
        CHROMA_MEMORY_LIMIT="512Mi"
        ;;
    test)
        NAMESPACE="ccc866-test"
        TOOLS_NAMESPACE="ccc866-tools"
        GIT_REF="master"
        CHROMA_PVC_SIZE="20Gi"
        AI_REPLICAS="2"
        AI_CPU_REQUEST="100m"
        AI_CPU_LIMIT="300m"
        AI_MEMORY_REQUEST="512Mi"
        AI_MEMORY_LIMIT="1Gi"
        CHROMA_CPU_REQUEST="50m"
        CHROMA_CPU_LIMIT="200m"
        CHROMA_MEMORY_REQUEST="256Mi"
        CHROMA_MEMORY_LIMIT="1Gi"
        ;;
    prod)
        NAMESPACE="ccc866-prod"
        TOOLS_NAMESPACE="ccc866-tools"
        GIT_REF="master"
        CHROMA_PVC_SIZE="50Gi"
        AI_REPLICAS="3"
        AI_CPU_REQUEST="200m"
        AI_CPU_LIMIT="500m"
        AI_MEMORY_REQUEST="1Gi"
        AI_MEMORY_LIMIT="2Gi"
        CHROMA_CPU_REQUEST="100m"
        CHROMA_CPU_LIMIT="500m"
        CHROMA_MEMORY_REQUEST="512Mi"
        CHROMA_MEMORY_LIMIT="2Gi"
        ;;
esac

echo "=== Digital Marketplace AI Services Deployment ==="
echo "Environment: $ENVIRONMENT"
echo "Namespace: $NAMESPACE"
echo "Action: $ACTION"
echo ""

# Function to build AI service
build_ai_service() {
    echo "Building AI service for $ENVIRONMENT..."

    oc -n $TOOLS_NAMESPACE process -f openshift/templates/ai/ai-digmkt-build.yaml \
        -p ENV_NAME=$ENVIRONMENT \
        -p GIT_REF=$GIT_REF | oc -n $TOOLS_NAMESPACE apply -f -

    echo "Starting build..."
    oc -n $TOOLS_NAMESPACE start-build ai-digmkt-$ENVIRONMENT

    echo "Waiting for build to complete..."
    oc -n $TOOLS_NAMESPACE logs -f bc/ai-digmkt-$ENVIRONMENT
}

# Function to deploy ChromaDB
deploy_chroma() {
    echo "Deploying ChromaDB for $ENVIRONMENT..."

    oc -n $NAMESPACE process -f openshift/templates/database/chroma-digmkt-deploy.yaml \
        -p TAG_NAME=$ENVIRONMENT \
        -p PVC_SIZE=$CHROMA_PVC_SIZE \
        -p CPU_REQUEST=$CHROMA_CPU_REQUEST \
        -p CPU_LIMIT=$CHROMA_CPU_LIMIT \
        -p MEMORY_REQUEST=$CHROMA_MEMORY_REQUEST \
        -p MEMORY_LIMIT=$CHROMA_MEMORY_LIMIT | oc -n $NAMESPACE apply -f -

    echo "Waiting for ChromaDB to be ready..."
    oc -n $NAMESPACE rollout status dc/chroma-digmkt-$ENVIRONMENT
}

# Function to deploy AI service
deploy_ai_service() {
    echo "Deploying AI service for $ENVIRONMENT..."

    oc -n $NAMESPACE process -f openshift/templates/ai/ai-digmkt-deploy.yaml \
        -p TAG_NAME=$ENVIRONMENT \
        -p CHROMA_URL=http://chroma-digmkt-$ENVIRONMENT:8000 \
        -p DATABASE_SERVICE_NAME=patroni-pg12 \
        -p REPLICAS=$AI_REPLICAS \
        -p CPU_REQUEST=$AI_CPU_REQUEST \
        -p CPU_LIMIT=$AI_CPU_LIMIT \
        -p MEMORY_REQUEST=$AI_MEMORY_REQUEST \
        -p MEMORY_LIMIT=$AI_MEMORY_LIMIT | oc -n $NAMESPACE apply -f -

    echo "Waiting for AI service to be ready..."
    oc -n $NAMESPACE rollout status dc/ai-digmkt-$ENVIRONMENT
}

# Function to deploy network policies
deploy_network_policies() {
    echo "Deploying network policies for $ENVIRONMENT..."

    oc -n $NAMESPACE process -f openshift/templates/network/ai-network-policy.yaml \
        -p TAG_NAME=$ENVIRONMENT | oc -n $NAMESPACE apply -f -
}

# Function to run health checks
health_checks() {
    echo "Running health checks..."

    echo "Checking AI service health..."
    oc -n $NAMESPACE exec -it dc/ai-digmkt-$ENVIRONMENT -- curl -f http://localhost:5000/health || echo "AI service health check failed"

    echo "Checking ChromaDB health..."
    oc -n $NAMESPACE exec -it dc/chroma-digmkt-$ENVIRONMENT -- curl -f http://localhost:8000/api/v1/heartbeat || echo "ChromaDB health check failed"

    echo "Checking service connectivity..."
    oc -n $NAMESPACE exec -it dc/ai-digmkt-$ENVIRONMENT -- curl -f http://chroma-digmkt-$ENVIRONMENT:8000/api/v1/heartbeat || echo "AI to ChromaDB connectivity failed"
}

# Execute based on action
case $ACTION in
    build)
        build_ai_service
        ;;
    deploy)
        deploy_chroma
        deploy_ai_service
        deploy_network_policies
        health_checks
        ;;
    all)
        build_ai_service
        deploy_chroma
        deploy_ai_service
        deploy_network_policies
        health_checks
        ;;
    *)
        echo "Error: Action must be one of: build, deploy, all"
        exit 1
        ;;
esac

echo ""
echo "=== Deployment Summary ==="
echo "Environment: $ENVIRONMENT"
echo "Services deployed:"
echo "  - ChromaDB: http://chroma-digmkt-$ENVIRONMENT:8000"
echo "  - AI Service: http://ai-digmkt-$ENVIRONMENT:5000"
echo ""
echo "To check status:"
echo "  oc -n $NAMESPACE get pods -l app-group=digmkt"
echo ""
echo "To check logs:"
echo "  oc -n $NAMESPACE logs -f dc/ai-digmkt-$ENVIRONMENT"
echo "  oc -n $NAMESPACE logs -f dc/chroma-digmkt-$ENVIRONMENT"
echo ""
echo "Deployment completed successfully!"
