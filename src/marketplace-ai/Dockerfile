FROM --platform=linux/amd64 docker.io/node:22-slim AS ai_service_build
ARG DIRPATH=/usr/app
WORKDIR $DIRPATH

# Copy package files
COPY package*.json yarn.lock ./
# COPY .yarnrc.yml ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY src ./src
COPY nest-cli.json tsconfig*.json ./

# Build the application
RUN yarn build

# Production stage
FROM --platform=linux/amd64 docker.io/node:22-slim
ARG DIRPATH=/usr/app
WORKDIR $DIRPATH

# Copy package files
COPY --from=ai_service_build $DIRPATH/package*.json $DIRPATH/yarn.lock ./
# COPY --from=ai_service_build $DIRPATH/.yarnrc.yml ./

# Install only production dependencies
RUN yarn install --frozen-lockfile --production && yarn cache clean

# Pre-download models to default cache location
RUN node -e "\
const { pipeline } = require('@xenova/transformers'); \
(async () => { \
  console.log('Downloading model...'); \
  await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { quantized: true }); \
  console.log('Model downloaded successfully'); \
})().catch(console.error);"

# Copy built application
COPY --from=ai_service_build --chown=node $DIRPATH/dist ./dist

# Create temp directory and set permissions - FIXED VERSION
RUN mkdir $DIRPATH/__tmp && chmod o+w $DIRPATH/__tmp && \
    chown -R node:node $DIRPATH

USER node
EXPOSE 5000

# Health check
# HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
#   CMD curl -f http://localhost:5000/health || exit 1

CMD ["node", "dist/main"]
