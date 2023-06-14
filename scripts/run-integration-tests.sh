#!/usr/bin/env bash
set -e

export POSTGRES_URL='postgresql://digmkt-test:digmkt-test@localhost:5433/digmkt-test'
export NODE_ENV='test'
export SERVER_HOST="0.0.0.0"
export SERVER_PORT="3000"
export LOG_MEM_USAGE="false"
export LOG_LEVEL="error"
export DISABLE_NOTIFICATIONS="1"

docker compose up -d test-db

yarn migrations:latest

yarn jest --detectOpenHandles --forceExit --config tests/jest.back-end.ts
