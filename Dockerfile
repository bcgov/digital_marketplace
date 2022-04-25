FROM --platform=linux/amd64 docker.io/node:16.13 AS dm_app_build
ARG DIRPATH=/usr/app
WORKDIR $DIRPATH
COPY ./src $DIRPATH/src
COPY package.json gruntfile.js yarn.lock tsconfig.json ./
COPY ./lib $DIRPATH/lib
COPY ./grunt-configs ./grunt-configs

# `yarn install` runs twice as a workaround for development and production
# dependencies in package.json needing better taxonomy

# NODE_ENV=production is passed here to allow for specific dev env variables when NODE_ENV=development
# @see /src/back-end/config.ts::developmentMailerConfigOptions
RUN yarn install --frozen-lockfile && \
    NODE_ENV=production npm run front-end:build && \
    npm run back-end:build && \
    yarn install --frozen-lockfile --production && \
    yarn cache clean && \
    rmdir $DIRPATH/tmp && \
    mkdir $DIRPATH/__tmp

FROM --platform=linux/amd64 docker.io/node:16.13
ARG DIRPATH=/usr/app
WORKDIR $DIRPATH
COPY --from=dm_app_build --chown=node $DIRPATH ./
RUN chown root $DIRPATH/__tmp
USER node
EXPOSE 3000
CMD node build/back-end/back-end/start.js
