FROM --platform=linux/amd64 docker.io/node:16
WORKDIR /usr/app
COPY ./src /usr/app/src
COPY package.json gruntfile.js yarn.lock tsconfig.json .env* ./
COPY ./lib /usr/app/lib
COPY ./grunt-configs ./grunt-configs

RUN yarn install --frozen-lockfile --production=false && \
    yarn run front-end:build && \
    yarn run back-end:build && \
    yarn install --frozen-lockfile --production=true && \
    yarn cache clean && \
    chmod -R 775 /usr/app && \
    chown -R node:root /usr/app

EXPOSE 3000
ENTRYPOINT ["/usr/app/src/front-end/docker-entrypoint.sh"]
