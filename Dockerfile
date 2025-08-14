FROM --platform=linux/amd64 docker.io/node:22 AS dm_app_build
ARG DIRPATH=/usr/app
ARG VITE_AI_SERVICE_URL
WORKDIR $DIRPATH
COPY ./src $DIRPATH/src
COPY package.json yarn.lock tsconfig.json vite.config.mts ./
COPY ./lib $DIRPATH/lib


# `yarn install` runs twice as a workaround for development and production
# dependencies in package.json needing better taxonomy

# VITE_NODE_ENV=production is passed here to allow for specific dev env variables when VITE_NODE_ENV=development
# @see /src/back-end/config.ts::developmentMailerConfigOptions
RUN yarn install --frozen-lockfile && \
    VITE_NODE_ENV=production \
    VITE_AI_SERVICE_URL=${VITE_AI_SERVICE_URL} \
    npm run front-end:build && \
    npm run back-end:build:production && \
    yarn install --frozen-lockfile --production && \
    yarn cache clean && \
    rm -Rf $DIRPATH/tmp && \
    mkdir $DIRPATH/__tmp

FROM --platform=linux/amd64 docker.io/node:22
ARG DIRPATH=/usr/app
WORKDIR $DIRPATH
COPY --from=dm_app_build --chown=node $DIRPATH ./
RUN chmod o+w $DIRPATH/__tmp
USER node
EXPOSE 3000
CMD node build/back-end/back-end/start.js
